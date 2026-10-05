import { existsSync, readFileSync } from "node:fs";

const failures = [];

const canonicalDocs = [
  "docs/03-analysis/bug-finding-coverage.md",
  "docs/03-analysis/capacity-concurrency.md",
  "docs/03-analysis/compatibility.md",
  "docs/03-analysis/education.md",
  "docs/05-validation/runtime-proof.md",
  "docs/05-validation/search-and-falsification.md",
  "docs/05-validation/retest-and-regression.md",
];

for (const path of canonicalDocs) {
  if (!existsSync(path)) failures.push("Missing canonical documentation owner: " + path);
}

const compatibilityPointers = [
  "docs/03-analysis/detection-coverage-assurance.md",
  "docs/03-analysis/gameplay-audit-blind-spots.md",
  "docs/03-analysis/cross-system-interaction-audit.md",
  "docs/03-analysis/audit-finalization-checklist.md",
  "docs/03-analysis/capacity-and-concurrency-contract.md",
  "docs/03-analysis/capacity-concurrency-audit-checklist.md",
  "docs/03-analysis/compatibility-runtime.md",
  "docs/03-analysis/education-runtime.md",
  "docs/05-validation/active-runtime-diagnosis.md",
  "docs/05-validation/runtime-control.md",
  "docs/05-validation/runtime-observation.md",
  "docs/05-validation/runtime-laboratory.md",
  "docs/05-validation/live-harness.md",
  "docs/05-validation/live-regression-runner.md",
  "docs/05-validation/bedrock-runtime-probes.md",
  "docs/05-validation/bedrock-runtime-telemetry.md",
  "docs/05-validation/bedrock-state-observation.md",
  "docs/05-validation/bounded-state-exploration.md",
  "docs/05-validation/concurrency-perturbation.md",
  "docs/05-validation/dynamic-invariant-mining.md",
  "docs/05-validation/invariant-mining-advanced.md",
  "docs/05-validation/mutation-testing.md",
  "docs/05-validation/script-and-graph-mutation.md",
  "docs/05-validation/reliability-search.md",
  "docs/05-validation/runtime-search-feedback.md",
  "docs/05-validation/regression.md",
  "docs/05-validation/retest-planning.md",
  "docs/05-validation/portfolio-retest.md",
  "docs/05-validation/campaign-history-and-minimization.md",
  "docs/05-validation/history-driven-search.md",
];

for (const path of compatibilityPointers) {
  if (!existsSync(path)) {
    failures.push("Missing compatibility pointer during migration: " + path);
    continue;
  }
  const text = readFileSync(path, "utf8");
  if (!/Compatibility pointer/i.test(text)) {
    failures.push(path + " must remain an explicit compatibility pointer.");
  }
  if (text.length > 1600) {
    failures.push(path + " is growing back into a parallel documentation authority.");
  }
}

const validationReadme = existsSync("docs/05-validation/README.md")
  ? readFileSync("docs/05-validation/README.md", "utf8")
  : "";
for (const owner of [
  "runtime-proof.md",
  "search-and-falsification.md",
  "retest-and-regression.md",
]) {
  if (!validationReadme.includes(owner)) {
    failures.push("docs/05-validation/README.md must route to " + owner);
  }
}

const analysisReadme = existsSync("docs/03-analysis/README.md")
  ? readFileSync("docs/03-analysis/README.md", "utf8")
  : "";
if (!analysisReadme.includes("bug-finding-coverage.md")) {
  failures.push("docs/03-analysis/README.md must route to canonical bug-finding coverage.");
}

if (failures.length) {
  console.error("Documentation ownership violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Documentation ownership verification passed.");
