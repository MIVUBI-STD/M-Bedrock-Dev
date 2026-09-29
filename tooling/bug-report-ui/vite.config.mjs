import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const appRoot = fileURLToPath(
  new URL("../../apps/bug-report-ui/", import.meta.url),
);
const outDir = fileURLToPath(
  new URL("../../dist/bug-report-ui/", import.meta.url),
);

export default defineConfig({
  root: appRoot,
  plugins: [svelte()],
  build: {
    outDir,
    emptyOutDir: true,
  },
});
