import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { TRIAGE_EFFORT, TRIAGE_MODEL } from "./config.ts";
import { SYSTEM_PROMPT, buildUserMessage } from "./prompt.ts";
import { TRIAGE_SCHEMA, type Property, type Report, type Triage } from "./schema.ts";

export type TriageResult = {
  triage: Triage | null; // null when the model didn't finish (see stopReason)
  model: string; // the model that answered, from the response
  stopReason: string | null;
  usage: { input_tokens: number; output_tokens: number };
  latencyMs: number;
};

let client: Anthropic | undefined;

// Triage one repair report. This is the function the app calls, and the one the evals call.
export async function triage(
  report: Report,
  property: Property,
  options: { model?: string } = {},
): Promise<TriageResult> {
  client ??= new Anthropic();
  const started = performance.now();

  const response = await client.messages.parse({
    model: options.model ?? TRIAGE_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserMessage(report, property) }],
    output_config: {
      effort: TRIAGE_EFFORT,
      format: jsonSchemaOutputFormat(TRIAGE_SCHEMA, { transform: false }),
    },
  });

  return {
    triage: response.stop_reason === "end_turn" ? response.parsed_output : null,
    model: response.model,
    stopReason: response.stop_reason,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    },
    latencyMs: Math.round(performance.now() - started),
  };
}
