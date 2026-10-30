import { defineConfig } from "vite";
import { fixlistApi } from "./server/plugin.ts";

export default defineConfig({
  plugins: [fixlistApi()],
  server: { host: "127.0.0.1", port: 5173 },
});
