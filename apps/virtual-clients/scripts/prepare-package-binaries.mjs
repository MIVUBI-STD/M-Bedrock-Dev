import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const appRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(appRoot, "..", "..");
const backendRoot = resolve(repoRoot, "virtual-clients", "runtime-core");
const manifest = resolve(backendRoot, "Cargo.toml");
const binaries = resolve(appRoot, "src-tauri", "binaries");
const guestResources = resolve(appRoot, "src-tauri", "package-resources", "guest", "windows");

const run = (program, args, cwd = appRoot) => {
  const result = spawnSync(program, args, {
    cwd,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

const rustc = spawnSync("rustc", ["-vV"], {
  encoding: "utf8",
});
if (rustc.error) throw rustc.error;
if (rustc.status !== 0) process.exit(rustc.status ?? 1);
const host = /^host:\s*(.+)$/m.exec(rustc.stdout)?.[1]?.trim();
if (!host) throw new Error("Rust host target triple could not be resolved.");

run(
  "cargo",
  [
    "build",
    "--manifest-path",
    manifest,
    "--release",
    "--bin",
    "virtual-clients",
    "--bin",
    "virtual-guest-agent",
  ],
  repoRoot,
);

mkdirSync(binaries, { recursive: true });
for (const file of readdirSync(binaries)) {
  if (file.startsWith("virtual-clients-")) {
    rmSync(resolve(binaries, file), { force: true });
  }
}

const extension = host.includes("windows") ? ".exe" : "";
const cliSource = resolve(backendRoot, "target", "release", "virtual-clients" + extension);
if (!existsSync(cliSource)) throw new Error(`Required CLI was not built: ${cliSource}`);
const cliDestination = resolve(binaries, `virtual-clients-${host}${extension}`);
copyFileSync(cliSource, cliDestination);
console.log(`Prepared host sidecar: ${cliDestination}`);

const guestSource = resolve(backendRoot, "target", "release", "virtual-guest-agent" + extension);
if (!existsSync(guestSource)) throw new Error(`Required Guest Agent was not built: ${guestSource}`);
mkdirSync(guestResources, { recursive: true });
const guestDestination = resolve(guestResources, "virtual-guest-agent" + extension);
copyFileSync(guestSource, guestDestination);
console.log(`Prepared guest payload: ${guestDestination}`);
