// Pull candidate eval cases from the triage log.
// Every report staff corrected, then the most recent reports staff didn't change,
// until each category (the one staff saved) has five. Replies to an earlier report
// are skipped, and names, phone numbers and email addresses are replaced in the
// report and in the triage's summary.
// node scripts/candidates.ts
import { writeFileSync } from "node:fs";
import type { Candidate } from "../evals/types.ts";
import { loadLog, loadProperties, type LogEntry } from "../server/data.ts";
import { CATEGORIES } from "../src/triage/schema.ts";

const PER_CATEGORY = 5;
const properties = loadProperties();
const log = loadLog().filter((e) => !e.replyTo);

const changed = (e: LogEntry) =>
  e.output.category !== e.final.category || e.output.urgency !== e.final.urgency;

function scrub(text: string, propertyId: string): string {
  const tenant = properties.get(propertyId)!.tenant;
  const [first, ...rest] = tenant.name.split(" ");
  let scrubbed = text
    .replace(/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, "[email]")
    .replace(/(\+44\s?|\b0)7\d{3}\s?\d{3}\s?\d{3}\b/g, "[phone]");
  for (const name of [tenant.name, first, rest.join(" ")].filter(Boolean)) {
    scrubbed = scrubbed.replace(new RegExp(`\\b${name}\\b`, "g"), "[name]");
  }
  return scrubbed;
}

function toCandidate(e: LogEntry, reason: Candidate["reason"]): Candidate {
  return {
    id: e.id,
    propertyId: e.propertyId,
    channel: e.channel,
    receivedAt: e.receivedAt,
    report: scrub(e.report, e.propertyId),
    reason,
    model: { ...e.output, summary: scrub(e.output.summary, e.propertyId) },
    staff: { category: e.final.category, urgency: e.final.urgency },
  };
}

const corrected = log.filter(changed).map((e) => toCandidate(e, "corrected"));
const sampled: Candidate[] = [];
const newestFirst = log.filter((e) => !changed(e)).reverse();

for (const category of CATEGORIES) {
  const have = corrected.filter((c) => c.staff.category === category).length;
  const add = newestFirst.filter((e) => e.final.category === category).slice(0, Math.max(0, PER_CATEGORY - have));
  sampled.push(...add.map((e) => toCandidate(e, "sampled")));
}

const candidates = [...corrected, ...sampled].sort((a, b) => a.id.localeCompare(b.id));
writeFileSync("evals/candidates.jsonl", candidates.map((c) => JSON.stringify(c)).join("\n") + "\n");

console.log(`${corrected.length} corrected by staff, ${sampled.length} sampled, ${candidates.length} candidates`);
for (const category of CATEGORIES) {
  console.log(`  ${category.padEnd(14)} ${candidates.filter((c) => c.staff.category === category).length}`);
}
