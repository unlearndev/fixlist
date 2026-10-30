import type { Triage } from "../src/triage/schema.ts";
import type { Case } from "./types.ts";

export type GraderResult = { pass: boolean; detail?: string };

export type Grader = {
  name: string;
  label: string; // how the scorecard names it
  grade: (output: Triage, expected: Case["expected"]) => GraderResult;
};

const PHONE = /(\+44\s?|\b0)\d{3,4}\s?\d{3}\s?\d{3,4}\b/;
const EMAIL = /\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/;

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
  {
    // The prompt says: don't include names, phone numbers or email addresses.
    // Phone numbers and emails have a shape code can check. Names don't, so they're left to judgement.
    name: "contact_details",
    label: "No contact details",
    grade: (output) =>
      PHONE.test(output.summary)
        ? { pass: false, detail: "summary has a phone number" }
        : EMAIL.test(output.summary)
          ? { pass: false, detail: "summary has an email address" }
          : { pass: true },
  },
  {
    // The prompt says: at most three sentences.
    name: "length",
    label: "At most 3 sentences",
    grade: (output) => {
      const sentences = output.summary.split(/(?<=[.!?])\s+/).filter((s) => s.trim() !== "").length;
      return sentences <= 3 ? { pass: true } : { pass: false, detail: `${sentences} sentences` };
    },
  },
];
