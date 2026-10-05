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
  "docs/repair/transactions.md",
  "docs/repair/repair-planning.md",
  "docs/validation/runtime-proof.md",
  "docs/validation/search-and-falsification.md",
  "docs/validation/retest-and-regression.md",
  "docs/system/architecture.md",
  "docs/system/authority-model.md",
  "docs/system/canonical-naming.md",
  "docs/system/skill-routing.md",
  "docs/system/zero-waste-execution.md",
];

for (const path of canonicalDocs) {
  if (!existsSync(path)) {
    failures.push("Missing canonical documentation owner: " + path);
  }
}

const compatibilityPointers = [
  "docs/analysis/detection-coverage-assurance.md",
  "docs/analysis/gameplay-audit-blind-spots.md",
  "docs/analysis/cross-system-interaction-audit.md",
  "docs/analysis/audit-finalization-checklist.md",
  "docs/analysis/capacity-and-concurrency-contract.md",
  "docs/analysis/capacity-concurrency-audit-checklist.md",
  "docs/analysis/compatibility-runtime.md",
  "docs/analysis/education-runtime.md",
  "docs/analysis/player-session-runtime.md",
  "docs/analysis/player-life-runtime.md",
  "docs/analysis/script-api-lifecycle.md",
  "docs/analysis/script-api-return-contracts.md",
  "docs/analysis/script-api-signature-migrations.md",
  "docs/analysis/script-api-static-compatibility.md",
  "docs/analysis/script-api-usage-inventory.md",
  "docs/analysis/script-api-version-matrix.md",
  "docs/analysis/script-event-symbol-matrix.md",
  "docs/analysis/script-method-symbol-matrix.md",
  "docs/analysis/attack-sensor-knowledge.md",
  "docs/analysis/navigation-knowledge.md",
  "docs/analysis/targeting-knowledge.md",
  "docs/analysis/entity-event-reachability.md",
  "docs/analysis/entity-knowledge-graph.md",
  "docs/analysis/embedded-structure-runtime.md",
  "docs/analysis/embedded-command-graph.md",
  "docs/analysis/structure-load-correlation.md",
  "docs/analysis/structure-transform-chain.md",
  "docs/analysis/structure-chunk-knowledge.md",
  "docs/analysis/topology-candidates.md",
  "docs/analysis/native-chunk-correlation.md",
  "docs/analysis/education-npc-codebuilder.md",
  "docs/analysis/education-permission-blocks.md",
  "docs/analysis/world-db-native-evidence.md",
  "docs/analysis/native-world-differential.md",
  "docs/analysis/leveldb-keyspace.md",
  "docs/analysis/game-design-audit-checklist.md",
  "docs/analysis/observability-runtime.md",
  "docs/analysis/npc-dialogue-runtime.md",
  "docs/analysis/environment-hazards-runtime.md",
  "docs/analysis/validation-runtime.md",
  "docs/analysis/map-audit-routing.md",
  "docs/analysis/regression-audit-execution.md",
  "docs/analysis/input-gesture-runtime.md",
  "docs/analysis/interactive-blocks-runtime.md",
  "docs/analysis/knowledge-layer.md",
  "docs/analysis/state-scope.md",
  "docs/analysis/dialogue-scene-graph.md",
  "docs/analysis/project-model.md",
  "docs/analysis/forward-ground-truth-intake.md",
  "docs/analysis/command-effects.md",
];

for (const path of compatibilityPointers) {
  if (!existsSync(path)) {
    failures.push("Missing analysis compatibility pointer during migration: " + path);
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

for (const prefix of [
  "docs/07-operations/",
  "docs/04-reporting/",
]) {
  for (const path of tracked.filter((item) => item.startsWith(prefix))) {
    failures.push("Retired documentation domain must not exist: " + path);
  }
}

const retiredAuthorityPaths = [
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

for (const path of retiredAuthorityPaths) {
  if (existsSync(path)) {
    failures.push("Retired authority path must not exist: " + path);
  }
}

const validationReadme = existsSync("docs/validation/README.md")
  ? readFileSync("docs/validation/README.md", "utf8")
  : "";

for (const owner of [
  "runtime-proof.md",
  "search-and-falsification.md",
  "retest-and-regression.md",
]) {
  if (!validationReadme.includes(owner)) {
    failures.push("docs/validation/README.md must route to " + owner);
  }
}

const analysisReadme = existsSync("docs/analysis/README.md")
  ? readFileSync("docs/analysis/README.md", "utf8")
  : "";

if (!analysisReadme.includes("bug-finding-coverage.md")) {
  failures.push("docs/analysis/README.md must route to canonical bug-finding coverage.");
}

if (failures.length) {
  console.error("Documentation ownership violations:");
  for (const failure of failures) console.error("- " + failure);
  process.exit(1);
}

console.log("Documentation ownership verification passed.");
