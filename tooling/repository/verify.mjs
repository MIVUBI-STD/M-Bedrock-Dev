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
  ".node-version",
  ".editorconfig",
  ".gitattributes",
  "docs/README.md",
  "docs/01-product/README.md",
  "docs/02-artifacts/README.md",
  "docs/03-analysis/README.md",
  "docs/04-repair/README.md",
  "docs/05-validation/README.md",
  "docs/06-system/development-discipline.md",
  "docs/06-system/implementation-map.md",
  "docs/06-system/skill-routing.md",
  "docs/06-system/development-operations.md",
  "docs/07-operations/current-validation.md",
  "docs/07-operations/next-action.md",
  "DEV.cmd",
  "packages/AGENTS.md",
  "analyzers/AGENTS.md",
  "adapters/AGENTS.md",
  "apps/AGENTS.md",
  "rules/AGENTS.md",
  "schemas/AGENTS.md",
  "fixtures/AGENTS.md",
  "tooling/AGENTS.md",
  "workspace/AGENTS.md",
  "tooling/windows-toolchain/dev.ps1"
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length > 0) {
  console.error("Missing canonical repository owners:");
  for (const path of missing) console.error(`- ${path}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const toolchain = JSON.parse(readFileSync("toolchain.json", "utf8"));
const version = readFileSync("VERSION", "utf8").trim();
const nodeVersion = readFileSync(".node-version", "utf8").trim();

if (pkg.version !== version) {
  console.error(`VERSION mismatch: package.json=${pkg.version}, VERSION=${version}`);
  process.exit(1);
}

const requiredNodeMajor = String(toolchain?.node?.major ?? "");
if (!requiredNodeMajor || nodeVersion !== requiredNodeMajor) {
  console.error(`Node authority mismatch: toolchain.json=${requiredNodeMajor}, .node-version=${nodeVersion}`);
  process.exit(1);
}

if (!String(pkg.engines?.node ?? "").includes(requiredNodeMajor)) {
  console.error("package.json engines.node does not reflect toolchain Node authority.");
  process.exit(1);
}

for (const pattern of ["*.mcworld", "*.mcpack", "*.mcaddon"]) {
  const tracked = execFileSync("git", ["ls-files", pattern], { encoding: "utf8" }).trim();
  if (tracked) {
    console.error(`Tracked production artifact(s) forbidden by repository policy (${pattern}):`);
    console.error(tracked);
    process.exit(1);
  }
}

const forbiddenRootNames = [
  "TEST.cmd",
  "BUILD.cmd",
  "VERIFY.cmd",
  "RUN.cmd"
];

for (const path of forbiddenRootNames) {
  if (existsSync(path)) {
    console.error(`Parallel root command surface is forbidden: ${path}`);
    process.exit(1);
  }
}

console.log("Repository policy verification passed.");
