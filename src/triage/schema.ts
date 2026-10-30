export const CATEGORIES = [
  "plumbing",
  "heating",
  "electrical",
  "gas",
  "damp_mould",
  "doors_windows",
  "appliances",
  "other",
] as const;

export const URGENCIES = ["emergency", "urgent", "routine"] as const;

export type Category = (typeof CATEGORIES)[number];
export type Urgency = (typeof URGENCIES)[number];

export type Triage = { category: Category; urgency: Urgency; summary: string };

// What the model must return for every report. The API holds the model to this schema.
export const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: CATEGORIES },
    urgency: { type: "string", enum: URGENCIES },
    summary: { type: "string" },
  },
  required: ["category", "urgency", "summary"],
  additionalProperties: false,
} as const;

export type Property = {
  id: string;
  address: string;
  type: string;
  toilets: number;
  heating: string;
  gasSupply: boolean;
  vulnerableTenant: boolean;
  vulnerableNote?: string;
  tenant: { name: string; phone: string; email: string };
};

export type Report = {
  text: string;
  channel: "email" | "form" | "phone";
  receivedAt: string;
};
