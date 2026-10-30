import type { IncomingMessage, ServerResponse } from "node:http";
import { send } from "./http.ts";
import { loadLog, loadProperties } from "./data.ts";
import { reviewApi } from "./review.ts";

type Next = (err?: unknown) => void;

export async function api(req: IncomingMessage, res: ServerResponse, next: Next) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith("/api/")) return next();

  try {
    if (req.method === "GET" && url.pathname === "/api/reports") {
      const properties = loadProperties();
      const reports = loadLog()
        .map((entry) => {
          const property = properties.get(entry.propertyId)!;
          return { ...entry, address: property.address, tenant: property.tenant.name };
        })
        .reverse();
      return send(res, 200, reports);
    }

    if (url.pathname.startsWith("/api/review/") && (await reviewApi(req, res))) return;

    if (req.method === "GET" && url.pathname.startsWith("/api/properties/")) {
      const property = loadProperties().get(url.pathname.split("/").pop()!);
      return property ? send(res, 200, property) : send(res, 404, { error: "Not found" });
    }

    return send(res, 404, { error: "Not found" });
  } catch (error) {
    return send(res, 500, { error: String(error) });
  }
}
