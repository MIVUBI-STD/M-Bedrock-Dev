import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const required = [
  "AGENTS.md",
  "CONTEXT.md",
  "GITHUB_RULES.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "README.md",
  "VERSION",
  "toolchain.json",
  "docs/README.md",
  "docs/06-system/development-discipline.md",
  "docs/06-system/implementation-map.md",
  "docs/06-system/skill-routing.md",
  "docs/06-system/development-operations.md",
  "docs/07-operations/current-validation.md",
  "docs/07-operations/next-action.md",
  "DEV.cmd",
  "tooling/windows-toolchain/dev.ps1"
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length > 0) {
  console.error("Missing canonical repository owners:");
  for (const path of missing) console.error(`- ${path}`);
  process.exit(1);
}

for (const path of ["package.json", "toolchain.json"]) {
  JSON.parse(readFileSync(path, "utf8"));
}

const forbiddenExtensions = ["*.mcworld", "*.mcpack", "*.mcaddon"];
for (const pattern of forbiddenExtensions) {
  const tracked = execFileSync("git", ["ls-files", pattern], { encoding: "utf8" }).trim();
  if (tracked) {
    console.error(`Tracked production artifact(s) forbidden by repository policy (${pattern}):`);
    console.error(tracked);
    process.exit(1);
  }
}

console.log("Repository policy verification passed.");
