// Triage one report from the log again, with the current prompt and model.
// npm run triage -- T-1022
import { loadLog, loadProperties, reportOf } from "../server/data.ts";
import { triage } from "../src/triage/triage.ts";

const id = process.argv[2];
const entry = loadLog().find((e) => e.id === id);
if (!entry) {
  console.error(`No report with the id ${id ?? "(none)"}. Try one from data/triage-log.jsonl, such as T-1022.`);
  process.exit(1);
}

const property = loadProperties().get(entry.propertyId)!;
const result = await triage(reportOf(entry), property);

console.log(JSON.stringify(result.triage, null, 2));
console.log(`\n${result.model} · ${result.usage.input_tokens} tokens in, ${result.usage.output_tokens} out · ${(result.latencyMs / 1000).toFixed(1)}s`);
