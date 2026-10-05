import { existsSync, readFileSync } from "node:fs";

const failures = [];

const { execFileSync } = await import("node:child_process");
const tracked = execFileSync("git", ["ls-files", "docs"], { encoding: "utf8" })
  .split(/\r?\n/)
  .filter(Boolean);
const forbiddenAnalysisDataPatterns = [
  /\/.*-runs\//,
  /\/.*queue.*\.json$/i,
  /\/.*scorecard.*\.json$/i,
  /\/.*acceptance.*\.json$/i,
  /\/.*audit-\d{4}-\d{2}-\d{2}\.json$/i,
];
for (const path of tracked) {
  if (forbiddenAnalysisDataPatterns.some((pattern) => pattern.test(path))) {
    failures.push("Operational/history data must not live in docs/03-analysis: " + path);
  }
  if (path.endsWith(".schema.json")) {
    failures.push("Machine JSON must not live in docs: " + path);
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
  "docs/system/architecture.md",
  "docs/system/skill-routing.md",
  "docs/system/zero-waste-execution.md",
  "docs/repair/transactions.md",
  "docs/repair/repair-planning.md",
  "docs/validation/runtime-proof.md",
  "docs/validation/search-and-falsification.md",
  "docs/validation/retest-and-regression.md",
];

for (const path of canonicalDocs) {
  if (!existsSync(path)) failures.push("Missing canonical documentation owner: " + path);
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
  "docs/validation/active-runtime-diagnosis.md",
  "docs/validation/runtime-control.md",
  "docs/validation/runtime-observation.md",
  "docs/validation/runtime-laboratory.md",
  "docs/validation/live-harness.md",
  "docs/validation/live-regression-runner.md",
  "docs/validation/bedrock-runtime-probes.md",
  "docs/validation/bedrock-runtime-telemetry.md",
  "docs/validation/bedrock-state-observation.md",
  "docs/validation/bounded-state-exploration.md",
  "docs/validation/concurrency-perturbation.md",
  "docs/validation/dynamic-invariant-mining.md",
  "docs/validation/invariant-mining-advanced.md",
  "docs/validation/mutation-testing.md",
  "docs/validation/script-and-graph-mutation.md",
  "docs/validation/reliability-search.md",
  "docs/validation/runtime-search-feedback.md",
  "docs/validation/regression.md",
  "docs/validation/retest-planning.md",
  "docs/validation/portfolio-retest.md",
  "docs/validation/campaign-history-and-minimization.md",
  "docs/validation/history-driven-search.md",
  "docs/validation/reliability-strategy.md",
  "docs/validation/reliability-catalogs.md",
  "docs/validation/map-fingerprint.md",
  "docs/validation/update-intelligence.md",
  "docs/validation/version-aware-native-correlation.md",
  "docs/validation/blindspot-portfolio.md",
  "docs/validation/map-audit-benchmark-quality.md",
  "docs/validation/generative-multiplayer.md",
  "docs/validation/regression-session-report.md",
  "docs/validation/bedrock-runtime-emitter.md",
  "docs/validation/source-mutation-detection.md",
  "docs/validation/invariant-revalidation.md",
  "docs/system/integrated-analysis.md",
  "docs/system/orchestration.md",
  "docs/system/skill-contract.md",
  "docs/system/context-efficiency.md",
  "docs/repair/application.md",
  "docs/repair/filesystem-safety.md",
  "docs/repair/orchestrated-planning.md",
  "docs/repair/topology-planning.md",
  "docs/repair/typed-effects.md",
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

const operationsDocs = tracked.filter((path) => path.startsWith("docs/07-operations/"));
for (const path of operationsDocs) {
  failures.push("Retired docs operations domain must not exist: " + path);
}

const retiredAuthorityPaths = [
  "docs/07-operations/current-validation.md",
  "docs/07-operations/next-action.md",
  "docs/07-operations/gameplay-understanding-corpus.md",
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

if (existsSync("docs/04-reporting")) {
  failures.push("Retired duplicate docs domain must not exist: docs/04-reporting");
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