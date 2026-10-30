// Dollars per million tokens, from Anthropic's pricing page (checked 30 Oct 2026).
// Thinking tokens are billed as output tokens.
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

export function cost(model: string, usage: { input_tokens: number; output_tokens: number }): number {
  const price = PRICES[model];
  if (!price) return NaN;
  return (usage.input_tokens * price.input + usage.output_tokens * price.output) / 1_000_000;
}
