// Runs the triage feature over the golden dataset and grades every answer.
//
//   npm run eval                      the feature as it ships
//   npm run eval -- --model <id>      the same cases on another model
//   npm run eval -- --oracle          grade the expected answers (no API calls): should score 100%
//   npm run eval -- --null            grade a triage that always says "other, routine" (no API calls)
//   npm run eval -- --only T-1013,T-1019
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadProperties, readJsonl } from "../server/data.ts";
import { TRIAGE_MODEL } from "../src/triage/config.ts";
import { PROMPT_VERSION } from "../src/triage/prompt.ts";
import type { Triage } from "../src/triage/schema.ts";
import { triage } from "../src/triage/triage.ts";
import { graders } from "./graders.ts";
import { cost } from "./prices.ts";
import type { Case } from "./types.ts";

const EMERGENCY_REPS = 3; // an emergency has to come out as an emergency every time
const CONCURRENCY = 5;
const SHOW_FAILURES = 12; // the rest are in evals/results/latest.json

const { values: args } = parseArgs({
  options: {
    model: { type: "string", default: TRIAGE_MODEL },
    oracle: { type: "boolean", default: false },
    null: { type: "boolean", default: false },
    only: { type: "string" },
  },
});

type Attempt = {
  id: string;
  rep: number;
  output?: Triage;
  error?: string;
  model?: string;
  usage?: { input_tokens: number; output_tokens: number };
  latencyMs?: number;
};

const properties = loadProperties();
const thresholds = JSON.parse(readFileSync(new URL("thresholds.json", import.meta.url), "utf8")) as Record<string, number>;
let cases = readJsonl<Case>("evals/dataset.jsonl");
if (args.only) cases = cases.filter((c) => args.only!.split(",").includes(c.id));

const mode = args.oracle ? "oracle" : args.null ? "null" : args.model!;
const jobs = cases.flatMap((c) =>
  Array.from({ length: c.expected.urgency === "emergency" ? EMERGENCY_REPS : 1 }, (_, rep) => ({ c, rep })),
);

console.log(`Triage eval · ${mode} · prompt ${PROMPT_VERSION} · ${cases.length} cases · ${jobs.length} runs\n`);

// --- run the feature -------------------------------------------------------------------

async function attempt(c: Case, rep: number): Promise<Attempt> {
  if (args.oracle) return { id: c.id, rep, output: { ...c.expected, summary: "" } };
  if (args.null) return { id: c.id, rep, output: { category: "other", urgency: "routine", summary: "" } };

  try {
    const result = await triage(
      { text: c.report, channel: c.channel, receivedAt: c.receivedAt },
      properties.get(c.propertyId)!,
      { model: args.model },
    );
    const base = { id: c.id, rep, model: result.model, usage: result.usage, latencyMs: result.latencyMs };
    if (result.model !== args.model) return { ...base, error: `answered by ${result.model}, not ${args.model}` };
    if (!result.triage) return { ...base, error: `no answer (stop reason: ${result.stopReason})` };
    return { ...base, output: result.triage };
  } catch (error) {
    return { id: c.id, rep, error: error instanceof Error ? error.message : String(error) };
  }
}

const started = performance.now();
const attempts: Attempt[] = [];
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, async () => {
    while (next < jobs.length) {
      const { c, rep } = jobs[next++];
      attempts.push(await attempt(c, rep));
      if (process.stdout.isTTY) process.stdout.write(`\r  ${attempts.length} of ${jobs.length} runs`);
    }
  }),
);
if (process.stdout.isTTY) process.stdout.write("\r" + " ".repeat(30) + "\r");
const seconds = (performance.now() - started) / 1000;

// --- grade every answer ------------------------------------------------------------------
// A case passes a grader only if every run of it passes. Runs that errored aren't graded:
// an API error says nothing about the feature, so it's reported on its own.

type Row = { label: string; passed: number; total: number; threshold: number };
const failures: { line: string; critical: boolean }[] = [];
const rows: Row[] = [];
const errors = attempts.filter((a) => a.error);

const graded = cases
  .map((c) => ({ c, runs: attempts.filter((a) => a.id === c.id && a.output).sort((a, b) => a.rep - b.rep) }))
  .filter((g) => g.runs.length > 0);

const emergencies = graded.filter((g) => g.c.expected.urgency === "emergency");
const caught = emergencies.filter((g) => g.runs.every((r) => r.output!.urgency === "emergency"));
rows.push({ label: "Emergencies caught", passed: caught.length, total: emergencies.length, threshold: thresholds.emergencies ?? 1 });

for (const grader of graders) {
  let passed = 0;
  for (const { c, runs } of graded) {
    const results = runs.map((r) => grader.grade(r.output!, c.expected));
    const failed = results.filter((r) => !r.pass);
    if (failed.length === 0) {
      passed++;
      continue;
    }
    const times = runs.length > 1 ? ` in ${failed.length} of ${runs.length} runs` : "";
    const critical = grader.name === "urgency" && c.expected.urgency === "emergency";
    failures.push({ line: `  ${c.id}  ${grader.label.padEnd(20)} ${failed[0].detail}${times}${critical ? "   CRITICAL" : ""}`, critical });
  }
  rows.push({ label: grader.label, passed, total: graded.length, threshold: thresholds[grader.name] ?? 1 });
}

// --- report ----------------------------------------------------------------------------

const pct = (n: number, d: number) => (d === 0 ? "-" : `${Math.round((n / d) * 100)}%`);
const needs = (t: number) => (t === 1 ? "needs 100%" : `needs ${Math.round(t * 100)}%`);

if (failures.length === 0) console.log("Failures: none\n");
else {
  const sorted = failures.sort((a, b) => Number(b.critical) - Number(a.critical) || a.line.localeCompare(b.line));
  const more = sorted.length > SHOW_FAILURES ? `\n  ...and ${sorted.length - SHOW_FAILURES} more in evals/results/latest.json` : "";
  console.log(`Failures\n${sorted.slice(0, SHOW_FAILURES).map((f) => f.line).join("\n")}${more}\n`);
}
console.log("Scores");
let belowThreshold = 0;
for (const row of rows) {
  const ok = row.total > 0 && row.passed / row.total >= row.threshold;
  if (!ok) belowThreshold++;
  console.log(
    `  ${row.label.padEnd(22)} ${`${row.passed} of ${row.total}`.padEnd(9)} ${pct(row.passed, row.total).padStart(4)}   ${needs(row.threshold).padEnd(11)} ${ok ? "ok" : "FAIL"}`,
  );
}

console.log(errors.length ? `\nErrors (not graded)\n${errors.map((e) => `  ${e.id}  ${e.error}`).join("\n")}` : "\nErrors: none");

const usage = attempts.reduce(
  (sum, a) => ({ input_tokens: sum.input_tokens + (a.usage?.input_tokens ?? 0), output_tokens: sum.output_tokens + (a.usage?.output_tokens ?? 0) }),
  { input_tokens: 0, output_tokens: 0 },
);
if (!args.oracle && !args.null) {
  const dollars = cost(args.model!, usage);
  console.log(
    `${attempts.length} calls · ${usage.input_tokens.toLocaleString("en-GB")} tokens in · ${usage.output_tokens.toLocaleString("en-GB")} out · ${Number.isNaN(dollars) ? "cost unknown" : `$${dollars.toFixed(2)}`} · ${Math.round(seconds)}s`,
  );
}

mkdirSync(new URL("results/", import.meta.url), { recursive: true });
writeFileSync(
  new URL("results/latest.json", import.meta.url),
  JSON.stringify({ mode, promptVersion: PROMPT_VERSION, ranAt: new Date().toISOString(), rows, attempts }, null, 2),
);

process.exitCode = errors.length > 0 ? 2 : belowThreshold > 0 ? 1 : 0;
