import { CATEGORY_LABELS, URGENCY_LABELS, chip, esc, getJson, postJson } from "../lib.ts";

type Decision = { keep: boolean; expected?: { category: string; urgency: string }; note?: string } | null;

type CandidateRow = {
  id: string;
  report: string;
  channel: string;
  reason: "corrected" | "sampled";
  property: { type: string; toilets: number; heating: string; vulnerableTenant: string } | null;
  model: { category: string; urgency: string; summary: string };
  staff: { category: string; urgency: string };
  decision: Decision;
};

const tabs = [{ id: "label", label: "Label cases" }];

export async function renderReview(root: HTMLElement, tab = "label", id?: string) {
  root.innerHTML = `
    <section class="review">
      <nav class="tabs">${tabs.map((t) => `<a href="#/review/${t.id}" class="${t.id === tab ? "active" : ""}">${t.label}</a>`).join("")}</nav>
      <div id="tab"></div>
    </section>`;
  const body = root.querySelector<HTMLElement>("#tab")!;
  return renderLabel(body, id);
}

async function renderLabel(root: HTMLElement, id?: string) {
  const rows = await getJson<CandidateRow[]>("/api/review/candidates");
  if (rows.length === 0) {
    root.innerHTML = `<p class="empty">No candidates yet. Write them to <code>evals/candidates.jsonl</code>.</p>`;
    return;
  }
  const done = rows.filter((r) => r.decision).length;
  const kept = rows.filter((r) => r.decision?.keep).length;
  const current = rows.find((r) => r.id === id) ?? rows.find((r) => !r.decision) ?? rows[0];

  root.innerHTML = `
    <div class="split">
      <aside class="queue">
        <p class="progress"><strong>${done} of ${rows.length}</strong> checked · ${kept} in the dataset</p>
        <ul>
          ${rows
            .map(
              (r) => `
            <li class="${r.id === current.id ? "selected" : ""}">
              <a href="#/review/label/${r.id}">
                <span class="mark ${r.decision ? (r.decision.keep ? "kept" : "dropped") : ""}">${r.decision ? (r.decision.keep ? "✓" : "✕") : "•"}</span>
                <span class="id">${r.id}</span>
                <span class="reason ${r.reason}">${r.reason}</span>
              </a>
            </li>`,
            )
            .join("")}
        </ul>
      </aside>
      <article class="case">${labelForm(current)}</article>
    </div>`;

  const form = root.querySelector<HTMLElement>(".case")!;
  const pick = { category: current.decision?.expected?.category ?? current.staff.category, urgency: current.decision?.expected?.urgency ?? current.staff.urgency };

  form.querySelectorAll<HTMLButtonElement>("[data-pick]").forEach((button) => {
    button.addEventListener("click", () => {
      const [field, value] = button.dataset.pick!.split(":") as ["category" | "urgency", string];
      pick[field] = value;
      form.querySelectorAll(`[data-pick^="${field}:"]`).forEach((b) => b.classList.toggle("on", b === button));
    });
  });

  const save = async (keep: boolean) => {
    const note = form.querySelector<HTMLInputElement>("#note")!.value;
    await postJson("/api/review/label", { id: current.id, keep, expected: keep ? pick : undefined, note });
    const next = rows.find((r) => !r.decision && r.id !== current.id);
    if (next) location.hash = `#/review/label/${next.id}`;
    else renderLabel(root, current.id);
  };
  form.querySelector("#keep")!.addEventListener("click", () => save(true));
  form.querySelector("#drop")!.addEventListener("click", () => save(false));
}

function labelForm(c: CandidateRow): string {
  const expected = c.decision?.expected ?? c.staff;
  const options = (field: "category" | "urgency", labels: Record<string, string>) =>
    Object.entries(labels)
      .map(([value, label]) => `<button type="button" class="pick ${field} ${value}${expected[field] === value ? " on" : ""}" data-pick="${field}:${value}">${label}</button>`)
      .join("");

  return `
    <header>
      <h2>${c.id} <span class="reason ${c.reason}">${c.reason}</span></h2>
      ${c.property ? `<p class="meta">${esc(c.property.type)} · ${c.property.toilets} ${c.property.toilets === 1 ? "toilet" : "toilets"} · ${esc(c.property.heating)} · vulnerable tenant: ${esc(c.property.vulnerableTenant)}</p>` : ""}
    </header>
    <pre class="report">${esc(c.report)}</pre>
    <div class="then">
      <p><span class="label">AI said</span> ${chip("category", c.model.category)} ${chip("urgency", c.model.urgency)}</p>
      <p><span class="label">Staff saved</span> ${chip("category", c.staff.category)} ${chip("urgency", c.staff.urgency)}</p>
    </div>
    <div class="expected">
      <h3>Expected answer</h3>
      <div class="picks" id="expected-urgency">${options("urgency", URGENCY_LABELS)}</div>
      <div class="picks" id="expected-category">${options("category", CATEGORY_LABELS)}</div>
      <input id="note" placeholder="Note (why, if you changed anything)" value="${esc(c.decision?.note ?? "")}" />
      <div class="actions">
        <button id="keep" class="primary">Keep in dataset</button>
        <button id="drop">Leave out</button>
      </div>
    </div>`;
}
