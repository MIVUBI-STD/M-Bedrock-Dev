import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const migrations = [
  ["docs/01-product/", "docs/product/"],
  ["docs/02-artifacts/", "docs/artifacts/"],
  ["docs/03-analysis/", "docs/analysis/"],
  ["docs/04-repair/", "docs/repair/"],
  ["docs/05-validation/", "docs/validation/"],
  ["docs/06-system/", "docs/system/"],
];

const textExtensions = /\.(?:md|json|mjs|cjs|js|ts|tsx|ps1|cmd|yml|yaml)$/i;
const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((path) => textExtensions.test(path))
  .filter((path) => existsSync(path));

const ignore = new Set([
  "tooling/repository/verify-doc-path-migration-readiness.mjs",
  "planning/development.md",
]);

const references = [];

for (const path of tracked) {
  if (ignore.has(path)) continue;
  const content = readFileSync(path, "utf8");
  for (const [from, to] of migrations) {
    if (!content.includes(from)) continue;
    references.push({ path, from, to });
  }
}

if (references.length) {
  console.error("Documentation path migration is not ready.");
  console.error("References to numbered documentation paths remain:");
  for (const item of references) {
    console.error("- " + item.path + ": " + item.from + " -> " + item.to);
  }
  process.exit(1);
}

console.log("Documentation path migration references are clean.");