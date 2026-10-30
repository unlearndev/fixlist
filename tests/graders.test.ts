import { describe, expect, it } from "vitest";
import { graders } from "../evals/graders.ts";

const grader = (name: string) => graders.find((g) => g.name === name)!;
const expected = { category: "gas", urgency: "emergency" } as const;

describe("urgency grader", () => {
  it("passes a matching urgency", () => {
    expect(grader("urgency").grade({ category: "gas", urgency: "emergency", summary: "" }, expected).pass).toBe(true);
  });

  it("fails a different urgency and says what it got", () => {
    const result = grader("urgency").grade({ category: "gas", urgency: "urgent", summary: "" }, expected);
    expect(result).toEqual({ pass: false, detail: "expected emergency, got urgent" });
  });
});

describe("category grader", () => {
  it("fails a different category", () => {
    expect(grader("category").grade({ category: "heating", urgency: "emergency", summary: "" }, expected).pass).toBe(false);
  });
});
