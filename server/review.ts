import { writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Candidate, Case } from "../evals/types.ts";
import { readBody, send } from "./http.ts";
import { loadProperties, readJsonl } from "./data.ts";

const root = new URL("../", import.meta.url);

function writeJsonl(path: string, rows: unknown[]) {
  writeFileSync(new URL(path, root), rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
}

// Property facts the reviewer needs, without the tenant's contact details.
function facts(propertyId: string) {
  const p = loadProperties().get(propertyId);
  if (!p) return null;
  return {
    type: p.type,
    toilets: p.toilets,
    heating: p.heating,
    vulnerableTenant: p.vulnerableTenant ? `yes (${p.vulnerableNote})` : "no",
  };
}

export async function reviewApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/api/review/candidates") {
    const dataset = new Map(readJsonl<Case>("evals/dataset.jsonl").map((c) => [c.id, c]));
    const dropped = new Map(readJsonl<{ id: string; note?: string }>("evals/dropped.jsonl").map((d) => [d.id, d]));
    const candidates = readJsonl<Candidate>("evals/candidates.jsonl").map((c) => ({
      ...c,
      property: facts(c.propertyId),
      decision: dataset.has(c.id)
        ? { keep: true, expected: dataset.get(c.id)!.expected, note: dataset.get(c.id)!.note }
        : dropped.has(c.id)
          ? { keep: false, note: dropped.get(c.id)!.note }
          : null,
    }));
    send(res, 200, candidates);
    return true;
  }

  if (req.method === "POST" && url.pathname === "/api/review/label") {
    const body = (await readBody(req)) as { id: string; keep: boolean; expected?: Case["expected"]; note?: string };
    const candidate = readJsonl<Candidate>("evals/candidates.jsonl").find((c) => c.id === body.id);
    if (!candidate) {
      send(res, 404, { error: `No candidate ${body.id}` });
      return true;
    }
    const note = body.note?.trim() || undefined;
    const dataset = readJsonl<Case>("evals/dataset.jsonl").filter((c) => c.id !== body.id);
    const dropped = readJsonl<{ id: string; note?: string }>("evals/dropped.jsonl").filter((d) => d.id !== body.id);

    if (body.keep) {
      dataset.push({
        id: candidate.id,
        propertyId: candidate.propertyId,
        channel: candidate.channel,
        receivedAt: candidate.receivedAt,
        report: candidate.report,
        expected: body.expected ?? candidate.staff,
        source: candidate.reason,
        ...(note ? { note } : {}),
      });
    } else {
      dropped.push({ id: candidate.id, ...(note ? { note } : {}) });
    }

    dataset.sort((a, b) => a.id.localeCompare(b.id));
    dropped.sort((a, b) => a.id.localeCompare(b.id));
    writeJsonl("evals/dataset.jsonl", dataset);
    writeJsonl("evals/dropped.jsonl", dropped);
    send(res, 200, { ok: true, cases: dataset.length });
    return true;
  }

  return false;
}
