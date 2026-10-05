import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const failures = [];
const tracked = execFileSync("git", ["ls-files", "docs"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);

const forbiddenDataPatterns = [
  /\/.*-runs\//,
  /\/.*queue.*\.json$/i,
  /\/.*scorecard.*\.json$/i,
  /\/.*acceptance.*\.json$/i,
  /\/.*audit-\d{4}-\d{2}-\d{2}\.json$/i,
];

for (const path of tracked) {
  if (forbiddenDataPatterns.some((pattern) => pattern.test(path))) {
    failures.push("Operational/history data must not live in docs: " + path);
  }
  if (path.endsWith(".schema.json")) {
    failures.push("Machine JSON schema must not live in docs: " + path);
  }
  if (path.endsWith(".json") && !path.startsWith("docs/examples/")) {
    failures.push("Machine JSON must not live in docs except explicit examples: " + path);
  }
}

const canonicalDocs = [
  "docs/product/README.md",
  "docs/artifacts/README.md",
  "docs/analysis/README.md",
  "docs/analysis/master-selected-map-audit-workflow.md",
  "docs/analysis/mandatory-audit-procedure.md",
  "docs/analysis/bug-finding-coverage.md",
  "docs/analysis/capacity-concurrency.md",
  "docs/analysis/compatibility.md",
  "docs/analysis/education.md",
  "docs/analysis/player-lifecycle.md",
  "docs/analysis/script-api.md",
  "docs/analysis/entity-state-analysis.md",
  "docs/analysis/mcstructure.md",
  "docs/analysis/topology.md",
  "docs/analysis/world-db.md",
  "docs/repair/README.md",
  "docs/repair/transactions.md",
  "docs/repair/repair-planning.md",
  "docs/validation/README.md",
  "docs/validation/package-proof.md",
  "docs/validation/repair-validation.md",
  "docs/validation/runtime-proof.md",
  "docs/validation/search-and-falsification.md",
  "docs/validation/retest-and-regression.md",
  "docs/system/README.md",
  "docs/system/architecture.md",
  "docs/system/authority-model.md",
  "docs/system/canonical-naming.md",
  "docs/system/skill-routing.md",
  "docs/system/zero-waste-execution.md",
];

for (const path of canonicalDocs) {
  if (!existsSync(path)) failures.push("Missing canonical documentation owner: " + path);
}

const allowedValidationFiles = new Set([
  "docs/validation/README.md",
  "docs/validation/package-proof.md",
  "docs/validation/repair-validation.md",
  "docs/validation/runtime-proof.md",
  "docs/validation/search-and-falsification.md",
  "docs/validation/retest-and-regression.md",
]);
for (const path of tracked.filter((item) => item.startsWith("docs/validation/"))) {
  if (!allowedValidationFiles.has(path)) {
    failures.push("Unexpected validation documentation owner: " + path);
  }
}

const allowedRepairFiles = new Set([
  "docs/repair/README.md",
  "docs/repair/transactions.md",
  "docs/repair/repair-planning.md",
]);
for (const path of tracked.filter((item) => item.startsWith("docs/repair/"))) {
  if (!allowedRepairFiles.has(path)) {
    failures.push("Unexpected repair documentation owner: " + path);
  }
}

for (const prefix of ["docs/07-operations/", "docs/04-reporting/"]) {
  for (const path of tracked.filter((item) => item.startsWith(prefix))) {
    failures.push("Retired documentation domain must not exist: " + path);
  }
}

const retiredAnalysisPointers = [
  "audit-finalization-checklist.md",
  "attack-sensor-knowledge.md",
  "capacity-and-concurrency-contract.md",
  "capacity-concurrency-audit-checklist.md",
  "compatibility-runtime.md",
  "cross-system-interaction-audit.md",
  "detection-coverage-assurance.md",
  "dialogue-scene-graph.md",
  "education-npc-codebuilder.md",
  "education-permission-blocks.md",
  "education-runtime.md",
  "embedded-command-graph.md",
  "embedded-structure-runtime.md",
  "entity-event-reachability.md",
  "entity-knowledge-graph.md",
  "environment-hazards-runtime.md",
  "forward-ground-truth-intake.md",
  "game-design-audit-checklist.md",
  "gameplay-audit-blind-spots.md",
  "input-gesture-runtime.md",
  "interactive-blocks-runtime.md",
  "knowledge-layer.md",
  "leveldb-keyspace.md",
  "map-audit-routing.md",
  "native-chunk-correlation.md",
  "native-world-differential.md",
  "navigation-knowledge.md",
  "npc-dialogue-runtime.md",
  "observability-runtime.md",
  "player-life-runtime.md",
  "player-session-runtime.md",
  "project-model.md",
  "regression-audit-execution.md",
  "script-api-lifecycle.md",
  "script-api-return-contracts.md",
  "script-api-signature-migrations.md",
  "script-api-static-compatibility.md",
  "script-api-usage-inventory.md",
  "script-api-version-matrix.md",
  "script-event-symbol-matrix.md",
  "script-method-symbol-matrix.md",
  "state-scope.md",
  "structure-chunk-knowledge.md",
  "structure-load-correlation.md",
  "structure-transform-chain.md",
  "targeting-knowledge.md",
  "topology-candidates.md",
  "validation-runtime.md",
  "world-db-native-evidence.md",
];

for (const name of retiredAnalysisPointers) {
  const path = "docs/analysis/" + name;
  if (existsSync(path)) failures.push("Retired analysis pointer must stay removed: " + path);
}

const retiredPaths = [
  "docs/system/integrated-analysis.md",
  "docs/system/orchestration.md",
  "docs/system/skill-contract.md",
  "docs/system/context-efficiency.md",
  "docs/analysis/full-map-reaudit-queue.json",
  "docs/analysis/runtime-test-queue.json",
  "docs/analysis/regression-detection-corpus.json",
  "docs/analysis/runtime-coverage-audit.md",
  "docs/analysis/map-audit-schema-migration.md",
  "docs/analysis/map-audit-output-v2.json.example",
  "docs/analysis/proof-escalation-receipt.schema.json",
  "docs/analysis/multi-scenario-check-ledger.schema.json",
  "docs/system/contract-registry.json",
];
for (const path of retiredPaths) {
  if (existsSync(path)) failures.push("Retired authority path must stay removed: " + path);
}

const validationReadme = readFileSync("docs/validation/README.md", "utf8");
for (const owner of ["runtime-proof.md","search-and-falsification.md","retest-and-regression.md"]) {
  if (!validationReadme.includes(owner)) {
    failures.push("docs/validation/README.md must route to " + owner);
  }
}

const analysisReadme = readFileSync("docs/analysis/README.md", "utf8");
if (!analysisReadme.includes("bug-finding-coverage.md")) {
  failures.push("docs/analysis/README.md must route to canonical bug-finding coverage.");
}

if (failures.length) {
  console.error("Documentation ownership violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Documentation ownership verification passed.");
