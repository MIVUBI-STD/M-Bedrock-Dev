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
  "package-lock.json",
  ".node-version",
  ".editorconfig",
  ".gitattributes",
  ".github/dependabot.yml",
  "docs/README.md",
  "docs/01-product/README.md",
  "docs/02-artifacts/README.md",
  "docs/03-analysis/README.md",
  "docs/04-repair/README.md",
  "docs/05-validation/README.md",
  "docs/06-system/development-discipline.md",
  "docs/06-system/implementation-map.md",
  "docs/06-system/contract-registry.json",
  "tooling/repository/verify-contract-registry.mjs",
  "tooling/repository/verify-module-shape.mjs",
  "tooling/repository/verify-dependency-graph.mjs",
  "tooling/repository/audit-public-api.mjs",
  "tooling/repository/public-api-baseline.json",
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

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const allowedRootEntries = new Set([
  ".agents",
  ".editorconfig",
  ".gitattributes",
  ".github",
  ".gitignore",
  ".node-version",
  "AGENTS.md",
  "CONTEXT.md",
  "CONTRIBUTING.md",
  "DEV.cmd",
  "Experimental",
  "GITHUB_RULES.md",
  "README.md",
  "SECURITY.md",
  "VERSION",
  "adapters",
  "analyzers",
  "apps",
  "docs",
  "fixtures",
  "knowledge",
  "package-lock.json",
  "package.json",
  "packages",
  "reliability",
  "rules",
  "runtime",
  "schemas",
  "toolchain.json",
  "tooling",
  "tsconfig.json",
  "workspace"
]);

const trackedRootEntries = new Set(
  trackedFiles.map((path) => path.split("/")[0]).filter(Boolean)
);
const unexpectedRootEntries = [...trackedRootEntries]
  .filter((entry) => !allowedRootEntries.has(entry))
  .sort();

if (unexpectedRootEntries.length > 0) {
  console.error("Unexpected tracked repository root entries:");
  for (const entry of unexpectedRootEntries) console.error(`- ${entry}`);
  process.exit(1);
}

const forbiddenLegacyPrefixes = [
  "scripts/",
  "fixtures/regression/"
];

const legacyTracked = trackedFiles.filter((path) =>
  forbiddenLegacyPrefixes.some((prefix) => path.startsWith(prefix))
);

if (legacyTracked.length > 0) {
  console.error("Legacy repository paths are forbidden:");
  for (const path of legacyTracked) console.error(`- ${path}`);
  process.exit(1);
}

const missing = required.filter((path) => !existsSync(path));
if (missing.length > 0) {
  console.error("Missing canonical repository owners:");
  for (const path of missing) console.error(`- ${path}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const toolchain = JSON.parse(readFileSync("toolchain.json", "utf8"));
const version = readFileSync("VERSION", "utf8").trim();
const nodeVersion = readFileSync(".node-version", "utf8").trim();

if (pkg.version !== version) {
  console.error(`VERSION mismatch: package.json=${pkg.version}, VERSION=${version}`);
  process.exit(1);
}

const requiredNodeMajor = String(toolchain?.node?.major ?? "");
const requiredNodeVersion = String(toolchain?.node?.version ?? "");
const requiredNpmVersion = String(toolchain?.npm?.version ?? "");

if (!requiredNodeMajor || !requiredNodeVersion || nodeVersion !== requiredNodeVersion) {
  console.error(
    `Node authority mismatch: toolchain.json=${requiredNodeVersion}, .node-version=${nodeVersion}`,
  );
  process.exit(1);
}

if (!requiredNodeVersion.startsWith(requiredNodeMajor + ".")) {
  console.error("toolchain.json node.version does not match node.major.");
  process.exit(1);
}

if (!String(pkg.engines?.node ?? "").includes(requiredNodeMajor)) {
  console.error("package.json engines.node does not reflect toolchain Node authority.");
  process.exit(1);
}

if (!requiredNpmVersion || pkg.packageManager !== `npm@${requiredNpmVersion}`) {
  console.error(
    `npm authority mismatch: package.json=${pkg.packageManager ?? "<missing>"}, toolchain.json=npm@${requiredNpmVersion}`,
  );
  process.exit(1);
}

function sortedRecord(value) {
  return Object.fromEntries(
    Object.entries(value ?? {}).sort(([left], [right]) =>
      left.localeCompare(right)
    ),
  );
}

const lockRoot = lock?.packages?.[""];
if (lock?.lockfileVersion !== 3 || !lockRoot) {
  console.error("package-lock.json must be lockfileVersion 3 with a root package entry.");
  process.exit(1);
}

if (lockRoot.name !== pkg.name || lockRoot.version !== pkg.version) {
  console.error("package-lock.json root identity does not match package.json.");
  process.exit(1);
}

if (
  JSON.stringify(sortedRecord(lockRoot.dependencies)) !==
  JSON.stringify(sortedRecord(pkg.dependencies))
) {
  console.error("package-lock.json runtime dependencies are out of sync with package.json.");
  process.exit(1);
}

if (
  JSON.stringify(sortedRecord(lockRoot.devDependencies)) !==
  JSON.stringify(sortedRecord(pkg.devDependencies))
) {
  console.error("package-lock.json dev dependencies are out of sync with package.json.");
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
