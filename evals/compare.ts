// Compares saved eval runs side by side, and lists the cases that changed.
//   npm run compare -- claude-sonnet-5 claude-sonnet-5-5 claude-haiku-5-5
// The first model is the one you're comparing against (usually the one you ship).
import { readFileSync } from "node:fs";

type Run = {
  model: string;
  ranAt: string;
  cases: string[];
  rows: { label: string; passed: number; total: number; threshold: number }[];
  failures: { id: string; check: string; detail: string; critical: boolean }[];
  errors: { id: string; error: string }[];
  costPer1000Reports: number;
  medianSeconds: number | null;
};

const models = process.argv.slice(2);
if (models.length < 2) {
  console.error("Give two or more models that have a saved run in evals/runs/, the one you ship first.");
  process.exit(1);
}
const runs = models.map((m) => JSON.parse(readFileSync(new URL(`runs/${m}.json`, import.meta.url), "utf8")) as Run);

const W = 20;
const line = (label: string, cells: string[]) => console.log(`  ${label.padEnd(24)}${cells.map((c) => c.padEnd(W)).join("")}`);

line("", runs.map((r) => r.model));
for (const label of runs[0].rows.map((r) => r.label)) {
  line(
    label,
    runs.map((run) => {
      const row = run.rows.find((r) => r.label === label);
      if (!row) return "-";
      const ok = row.total > 0 && row.passed / row.total >= row.threshold;
      return `${row.passed} of ${row.total}${ok ? "" : "  FAIL"}`;
    }),
  );
}
line("Errors", runs.map((r) => String(r.errors.length)));
line("Cost per 1,000 reports", runs.map((r) => `$${r.costPer1000Reports.toFixed(2)}`));
line("Median time per report", runs.map((r) => (r.medianSeconds === null ? "-" : `${r.medianSeconds.toFixed(1)}s`)));

const key = (f: Run["failures"][number]) => `${f.id} ${f.check}`;
const base = runs[0];
const baseFailures = new Set(base.failures.map(key));
console.log(`\nCases that changed, against ${base.model}`);
let any = false;
for (const run of runs.slice(1)) {
  const failures = new Set(run.failures.map(key));
  for (const f of run.failures.filter((f) => !baseFailures.has(key(f)))) {
    any = true;
    console.log(`  ${f.id}  ${run.model.padEnd(18)} worse   ${f.check}: ${f.detail}${f.critical ? "   CRITICAL" : ""}`);
  }
  for (const f of base.failures.filter((f) => !failures.has(key(f)))) {
    any = true;
    console.log(`  ${f.id}  ${run.model.padEnd(18)} better  ${f.check}`);
  }
}
if (!any) console.log("  none");
