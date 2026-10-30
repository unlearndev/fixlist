import type { Category, Report, Triage, Urgency } from "../src/triage/schema.ts";

// A report pulled from the log as a possible eval case, before anyone has checked its labels.
export type Candidate = {
  id: string; // the log id, such as T-1022
  propertyId: string;
  channel: Report["channel"];
  receivedAt: string;
  report: string; // with names, phone numbers and email addresses replaced
  reason: "corrected" | "sampled"; // why it was picked
  model: Triage; // what the triage said at the time
  staff: { category: Category; urgency: Urgency }; // what staff saved
};

// A case in the golden dataset: a report and the answer a person has checked.
export type Case = {
  id: string;
  propertyId: string;
  channel: Report["channel"];
  receivedAt: string;
  report: string;
  expected: { category: Category; urgency: Urgency };
  source: Candidate["reason"];
  note?: string;
};
