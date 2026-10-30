// The first eval: ten reports with the urgency each should get.
// node evals/first.ts
import { loadProperties, readJsonl } from "../server/data.ts";
import type { Report, Urgency } from "../src/triage/schema.ts";
import { triage } from "../src/triage/triage.ts";

type FirstCase = {
  id: string;
  propertyId: string;
  channel: Report["channel"];
  receivedAt: string;
  report: string;
  expectedUrgency: Urgency;
};

const cases = readJsonl<FirstCase>("evals/first-cases.jsonl");
const properties = loadProperties();
let passed = 0;

for (const c of cases) {
  const result = await triage(
    { text: c.report, channel: c.channel, receivedAt: c.receivedAt },
    properties.get(c.propertyId)!,
  );
  const got = result.triage?.urgency ?? `no answer (${result.stopReason})`;
  const pass = got === c.expectedUrgency;
  if (pass) passed++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${c.id}  expected ${c.expectedUrgency}, got ${got}`);
}

console.log(`\n${passed} of ${cases.length} passed`);
