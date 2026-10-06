import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const appRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(appRoot, "..", "..");
const backendRoot = resolve(repoRoot, "experiments", "virtual-clients", "backend");
const manifest = resolve(backendRoot, "Cargo.toml");
const binaries = resolve(appRoot, "src-tauri", "binaries");

const run = (program, args, cwd = appRoot) => {
  const result = spawnSync(program, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const rustc = spawnSync("rustc", ["-vV"], { encoding: "utf8", shell: process.platform === "win32" });
if (rustc.error) throw rustc.error;
if (rustc.status !== 0) process.exit(rustc.status ?? 1);
const host = /^host:\s*(.+)$/m.exec(rustc.stdout)?.[1]?.trim();
if (!host) throw new Error("Rust host target triple could not be resolved.");

run("cargo", ["build", "--manifest-path", manifest, "--release", "--bin", "virtual-clients", "--bin", "virtual-guest-agent"], repoRoot);

mkdirSync(binaries, { recursive: true });
for (const file of readdirSync(binaries)) {
  if (file.startsWith("virtual-clients-") || file.startsWith("virtual-guest-agent-")) {
    rmSync(resolve(binaries, file), { force: true });
  }
}
const extension = host.includes("windows") ? ".exe" : "";
for (const name of ["virtual-clients", "virtual-guest-agent"]) {
  const source = resolve(backendRoot, "target", "release", name + extension);
  if (!existsSync(source)) throw new Error(`Required sidecar was not built: ${source}`);
  const destination = resolve(binaries, `${name}-${host}${extension}`);
  copyFileSync(source, destination);
  console.log(`Prepared sidecar: ${destination}`);
}
