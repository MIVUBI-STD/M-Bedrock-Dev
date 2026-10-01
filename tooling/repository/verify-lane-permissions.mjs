import { readFileSync } from "node:fs";
import { evaluateLanePermission } from "../../.agents/permissions/evaluate-lane-permission.mjs";

const corpus = JSON.parse(
  readFileSync(".agents/evals/permission-cases.json", "utf8"),
);
const failures = [];

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
