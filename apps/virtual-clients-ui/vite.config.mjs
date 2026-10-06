import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const root = fileURLToPath(new URL("./", import.meta.url));
const outDir = fileURLToPath(new URL("../../dist/virtual-clients-ui/", import.meta.url));

export default defineConfig({
  root,
  base: "./",
  plugins: [svelte()],
  build: {
    outDir,
    emptyOutDir: true,
  },
});
