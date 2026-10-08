import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const retired = [
  "docs/01-product/",
  "docs/02-artifacts/",
  "docs/03-analysis/",
  "docs/04-repair/",
  "docs/05-validation/",
  "docs/06-system/",
  "01-product/",
  "02-artifacts/",
  "03-analysis/",
  "04-repair/",
  "05-validation/",
  "06-system/",
];


// Retired active-workspace owners. Check policy/navigation documents only:
// historical evidence and source fixtures may legitimately mention old paths.
const retiredWorkspaceOwners = [
  "workspace/active/",
  "workspace/reports/",
  "workspace/developer-notes.json",
  "workspace/publication/",
];
const isActivePolicyDocument = (path) =>
  path === "AGENTS.md" ||
  path === "CONTEXT.md" ||
  path === "GITHUB_RULES.md" ||
  path === "README.md" ||
  path.endsWith("/AGENTS.md") ||
  path.startsWith("docs/");

const textExtensions = /\.(?:md|json|mjs|js|cjs|ts|tsx|ps1|cmd|yml|yaml|html)$/i;
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((path) => textExtensions.test(path))
  .filter((path) => path !== "tooling/repository/verify-documentation-paths.mjs")
  .filter((path) => !path.startsWith("engine/reliability/history/"));

const failures = [];

for (const path of tracked) {
  if (!existsSync(path)) continue;
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    continue;
  }

  for (const token of retired) {
    if (text.includes(token)) {
      failures.push(path + " references retired documentation path: " + token);
    }
  }

  if (isActivePolicyDocument(path)) {
    for (const token of retiredWorkspaceOwners) {
      if (text.includes(token)) {
        failures.push(path + " references retired workspace owner: " + token);
      }
    }
  }
}

const retiredDirs = [
  "docs/01-product",
  "docs/02-artifacts",
  "docs/03-analysis",
  "docs/04-repair",
  "docs/05-validation",
  "docs/06-system",
];

for (const path of retiredDirs) {
  if (existsSync(path)) {
    failures.push("Retired documentation directory must not exist: " + path);
  }
}

for (const path of [
  "docs/product",
  "docs/artifacts",
  "docs/analysis",
  "docs/repair",
  "docs/validation",
  "docs/system",
]) {
  if (!existsSync(path)) {
    failures.push("Missing semantic documentation domain: " + path);
  }
}

if (failures.length) {
  console.error("Documentation path migration violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Documentation path migration verification passed.");