import { describe, expect, it } from "vitest";
import { CATEGORIES, TRIAGE_SCHEMA, URGENCIES } from "../src/triage/schema.ts";

describe("TRIAGE_SCHEMA", () => {
  it("only allows the agency's categories and urgencies", () => {
    expect(TRIAGE_SCHEMA.properties.category.enum).toEqual(CATEGORIES);
    expect(TRIAGE_SCHEMA.properties.urgency.enum).toEqual(URGENCIES);
  });

  it("requires every field and nothing else", () => {
    expect(TRIAGE_SCHEMA.required).toEqual(["category", "urgency", "summary"]);
    expect(TRIAGE_SCHEMA.additionalProperties).toBe(false);
  });
});
