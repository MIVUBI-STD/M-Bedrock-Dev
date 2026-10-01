import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { bugReportApiPlugin } from "./vite-api-plugin.ts";

const appRoot = fileURLToPath(
  new URL("../../apps/bug-report-ui/", import.meta.url),
);
const outDir = fileURLToPath(
  new URL("../../dist/bug-report-ui/", import.meta.url),
);

export default defineConfig({
  root: appRoot,
  plugins: [
    svelte(),
    bugReportApiPlugin(),
  ],
  build: {
    outDir,
    emptyOutDir: true,
  },
});
