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

describe("contact details grader", () => {
  const grade = (summary: string) => grader("contact_details").grade({ category: "gas", urgency: "emergency", summary }, expected);

  it("fails a summary with a phone number", () => {
    expect(grade("Call the tenant on 07700 900117 first.").pass).toBe(false);
  });

  it("fails a summary with an email address", () => {
    expect(grade("Email jamal.hussain@example.com to arrange access.").pass).toBe(false);
  });

  it("passes numbers that aren't phone numbers", () => {
    expect(grade("Boiler pressure is 1.5 bar and the code is F28.").pass).toBe(true);
  });
});

describe("length grader", () => {
  const grade = (summary: string) => grader("length").grade({ category: "gas", urgency: "emergency", summary }, expected);

  it("passes three sentences", () => {
    expect(grade("One. Two. Three.").pass).toBe(true);
  });

  it("fails four sentences", () => {
    expect(grade("One. Two. Three. Four.")).toEqual({ pass: false, detail: "4 sentences" });
  });

  it("doesn't count a decimal point as the end of a sentence", () => {
    expect(grade("Pressure is 1.5 bar. It drops daily.").pass).toBe(true);
  });
});
