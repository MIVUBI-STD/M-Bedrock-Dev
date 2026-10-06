import { readFileSync } from "node:fs";
import { evaluateLanePermission } from "../../.agents/permissions/evaluate-lane-permission.mjs";

const corpus = JSON.parse(
  readFileSync(".agents/evals/permission-cases.json", "utf8"),
);
const failures = [];

const pathAccess = JSON.parse(
  readFileSync(".agents/permissions/path-access.json", "utf8"),
);
const pathRules = pathAccess.rules ?? [];
const configuredPaths = pathRules.map((rule) => rule.path);

for (const stalePath of configuredPaths.filter((path) =>
  path.startsWith("workspace/active/")
)) {
  failures.push(
    "Stale workspace permission path is forbidden: " + stalePath,
  );
}

for (const requiredPath of [
  "workspace/projects/**/source/**",
  "workspace/projects/**/working/**",
  "workspace/projects/**/design/**",
]) {
  if (!configuredPaths.includes(requiredPath)) {
    failures.push(
      "Missing canonical workspace permission path: " + requiredPath,
    );
  }
}

for (const item of corpus.cases ?? []) {
  const result = evaluateLanePermission(item.request);
  if (result.decision !== item.expected) {
    failures.push(
      item.id + ": expected " + item.expected + " but received " + result.decision +
      " (" + result.reason + ")",
    );
  }
}

if (failures.length) {
  console.error("Lane permission preflight violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Lane permission preflight corpus passed.");
