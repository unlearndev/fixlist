export const CATEGORY_LABELS: Record<string, string> = {
  plumbing: "Plumbing",
  heating: "Heating",
  electrical: "Electrical",
  gas: "Gas",
  damp_mould: "Damp and mould",
  doors_windows: "Doors and windows",
  appliances: "Appliances",
  other: "Other",
};

export const URGENCY_LABELS: Record<string, string> = {
  emergency: "Emergency",
  urgent: "Urgent",
  routine: "Routine",
};

export function esc(text: unknown): string {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function chip(kind: "category" | "urgency", value: string): string {
  const label = kind === "category" ? CATEGORY_LABELS[value] : URGENCY_LABELS[value];
  return `<span class="chip ${kind} ${esc(value)}">${esc(label ?? value)}</span>`;
}

export function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json() as Promise<T>;
}
