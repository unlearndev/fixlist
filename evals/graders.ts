import type { Triage } from "../src/triage/schema.ts";
import type { Case } from "./types.ts";

export type GraderResult = { pass: boolean; detail?: string };

export type Grader = {
  name: string;
  label: string; // how the scorecard names it
  grade: (output: Triage, expected: Case["expected"]) => GraderResult;
};

export const graders: Grader[] = [
  {
    name: "urgency",
    label: "Urgency",
    grade: (output, expected) =>
      output.urgency === expected.urgency
        ? { pass: true }
        : { pass: false, detail: `expected ${expected.urgency}, got ${output.urgency}` },
  },
  {
    name: "category",
    label: "Category",
    grade: (output, expected) =>
      output.category === expected.category
        ? { pass: true }
        : { pass: false, detail: `expected ${expected.category}, got ${output.category}` },
  },
];
