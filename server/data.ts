import { readFileSync } from "node:fs";
import type { Category, Property, Report, Urgency } from "../src/triage/schema.ts";

export type LogEntry = {
  id: string;
  receivedAt: string;
  channel: Report["channel"];
  propertyId: string;
  report: string;
  model: string;
  promptVersion: string;
  output: { category: Category; urgency: Urgency; summary: string };
  final: { category: Category; urgency: Urgency; summaryEdited: boolean };
  handledBy: string;
  replyTo?: string;
};

const root = new URL("../", import.meta.url);

export function readJsonl<T>(path: string): T[] {
  let text: string;
  try {
    text = readFileSync(new URL(path, root), "utf8");
  } catch {
    return [];
  }
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as T);
}

export function loadLog(): LogEntry[] {
  return readJsonl<LogEntry>("data/triage-log.jsonl");
}

export function loadProperties(): Map<string, Property> {
  const list = JSON.parse(readFileSync(new URL("data/properties.json", root), "utf8")) as Property[];
  return new Map(list.map((p) => [p.id, p]));
}

export function reportOf(entry: Pick<LogEntry, "report" | "channel" | "receivedAt">): Report {
  return { text: entry.report, channel: entry.channel, receivedAt: entry.receivedAt };
}
