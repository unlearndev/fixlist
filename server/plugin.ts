import type { Plugin } from "vite";
import { api } from "./api.ts";

// Mounts Fixlist's small API on Vite's dev server, so `npm run dev` serves the whole app.
export function fixlistApi(): Plugin {
  return {
    name: "fixlist-api",
    configureServer(server) {
      server.middlewares.use(api);
    },
  };
}
