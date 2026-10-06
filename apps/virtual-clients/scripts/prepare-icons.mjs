import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "src-tauri", "app-icon.svg");
const outputs = [
  resolve(root, "src-tauri", "icons", "32x32.png"),
  resolve(root, "src-tauri", "icons", "128x128.png"),
  resolve(root, "src-tauri", "icons", "128x128@2x.png"),
  resolve(root, "src-tauri", "icons", "icon.ico")
];
const sourceMtime = statSync(source).mtimeMs;
if (outputs.every((path) => existsSync(path) && statSync(path).mtimeMs >= sourceMtime)) process.exit(0);
const result = spawnSync("npx", ["tauri", "icon", source], {
  cwd: root, stdio: "inherit", shell: process.platform === "win32"
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
