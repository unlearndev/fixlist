import { chip, esc, getJson, when, CATEGORY_LABELS, URGENCY_LABELS } from "../lib.ts";

type ReportRow = {
  id: string;
  receivedAt: string;
  channel: string;
  address: string;
  tenant: string;
  report: string;
  output: { category: string; urgency: string; summary: string };
  final: { category: string; urgency: string; summaryEdited: boolean };
  handledBy: string;
  replyTo?: string;
};

const changed = (r: ReportRow) =>
  r.output.category !== r.final.category || r.output.urgency !== r.final.urgency;

export async function renderInbox(root: HTMLElement, selectedId?: string) {
  const reports = await getJson<ReportRow[]>("/api/reports");
  const onlyChanged = sessionStorage.getItem("onlyChanged") === "1";
  const shown = onlyChanged ? reports.filter(changed) : reports;
  const selected = reports.find((r) => r.id === selectedId) ?? shown[0];

  root.innerHTML = `
    <section class="inbox">
      <div class="list">
        <div class="list-head">
          <h1>Repair reports</h1>
          <label class="toggle"><input type="checkbox" id="only-changed" ${onlyChanged ? "checked" : ""}> Changed by staff</label>
        </div>
        <ul>
          ${shown
            .map(
              (r) => `
            <li class="${r.id === selected?.id ? "selected" : ""}">
              <a href="#/reports/${r.id}">
                <div class="row-top"><span class="id">${r.id}</span><span class="when">${when(r.receivedAt)}</span></div>
                <div class="addr">${esc(r.address)}</div>
                <div class="chips">${chip("category", r.final.category)} ${chip("urgency", r.final.urgency)}${changed(r) ? ' <span class="chip changed">Changed</span>' : ""}</div>
              </a>
            </li>`,
            )
            .join("")}
        </ul>
      </div>
      <article class="detail">${selected ? detail(selected) : "<p>No reports.</p>"}</article>
    </section>`;

  root.querySelector<HTMLInputElement>("#only-changed")!.addEventListener("change", (e) => {
    sessionStorage.setItem("onlyChanged", (e.target as HTMLInputElement).checked ? "1" : "0");
    renderInbox(root, selectedId);
  });
}

function detail(r: ReportRow): string {
  const diff = (a: string, b: string, labels: Record<string, string>) =>
    a === b ? esc(labels[b]) : `<s>${esc(labels[a])}</s> ${esc(labels[b])}`;

  return `
    <header>
      <h2>${esc(r.address)}</h2>
      <p class="meta">${r.id} · ${esc(r.tenant)} · ${esc(r.channel)} · ${when(r.receivedAt)}${r.replyTo ? ` · reply to ${r.replyTo}` : ""}</p>
    </header>
    <pre class="report">${esc(r.report)}</pre>
    <div class="cards">
      <section class="card ai">
        <h3>AI triage</h3>
        <p>${chip("category", r.output.category)} ${chip("urgency", r.output.urgency)}</p>
        <p class="summary">${esc(r.output.summary)}</p>
      </section>
      <section class="card staff">
        <h3>Saved by staff (${esc(r.handledBy)})</h3>
        <p>Category: ${diff(r.output.category, r.final.category, CATEGORY_LABELS)}</p>
        <p>Urgency: ${diff(r.output.urgency, r.final.urgency, URGENCY_LABELS)}</p>
        <p>Summary: ${r.final.summaryEdited ? "edited before sending" : "sent as written"}</p>
      </section>
    </div>`;
}
