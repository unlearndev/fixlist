import "./style.css";
import { renderInbox } from "./views/inbox.ts";

const app = document.querySelector<HTMLElement>("#app")!;
const nav = document.querySelector<HTMLElement>("#nav")!;

const routes: { path: RegExp; label?: string; href?: string; render: (m: RegExpMatchArray) => Promise<void> }[] = [
  { path: /^#\/reports\/(T-\d+)$/, render: (m) => renderInbox(app, m[1]) },
  { path: /^#\/?$/, label: "Reports", href: "#/", render: () => renderInbox(app) },
];

async function route() {
  const hash = location.hash || "#/";
  nav.innerHTML = routes
    .filter((r) => r.label)
    .map((r) => `<a href="${r.href}" class="${hash === r.href || (r.href === "#/" && hash.startsWith("#/reports")) ? "active" : ""}">${r.label}</a>`)
    .join("");
  for (const r of routes) {
    const m = hash.match(r.path);
    if (m) return r.render(m);
  }
  return renderInbox(app);
}

window.addEventListener("hashchange", route);
route();
