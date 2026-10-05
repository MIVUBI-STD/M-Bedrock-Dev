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
  "docs/03-analysis/bug-finding-coverage.md",
  "docs/03-analysis/capacity-concurrency.md",
  "docs/03-analysis/compatibility.md",
  "docs/03-analysis/education.md",
  "docs/03-analysis/player-lifecycle.md",
  "docs/03-analysis/script-api.md",
  "docs/03-analysis/entity-state-analysis.md",
  "docs/03-analysis/mcstructure.md",
  "docs/03-analysis/topology.md",
  "docs/03-analysis/world-db.md",
  "docs/06-system/architecture.md",
  "docs/06-system/skill-routing.md",
  "docs/06-system/zero-waste-execution.md",
  "docs/04-repair/transactions.md",
  "docs/04-repair/repair-planning.md",
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
  "docs/03-analysis/player-session-runtime.md",
  "docs/03-analysis/player-life-runtime.md",
  "docs/03-analysis/script-api-lifecycle.md",
  "docs/03-analysis/script-api-return-contracts.md",
  "docs/03-analysis/script-api-signature-migrations.md",
  "docs/03-analysis/script-api-static-compatibility.md",
  "docs/03-analysis/script-api-usage-inventory.md",
  "docs/03-analysis/script-api-version-matrix.md",
  "docs/03-analysis/script-event-symbol-matrix.md",
  "docs/03-analysis/script-method-symbol-matrix.md",
  "docs/03-analysis/attack-sensor-knowledge.md",
  "docs/03-analysis/navigation-knowledge.md",
  "docs/03-analysis/targeting-knowledge.md",
  "docs/03-analysis/entity-event-reachability.md",
  "docs/03-analysis/entity-knowledge-graph.md",
  "docs/03-analysis/embedded-structure-runtime.md",
  "docs/03-analysis/embedded-command-graph.md",
  "docs/03-analysis/structure-load-correlation.md",
  "docs/03-analysis/structure-transform-chain.md",
  "docs/03-analysis/structure-chunk-knowledge.md",
  "docs/03-analysis/topology-candidates.md",
  "docs/03-analysis/native-chunk-correlation.md",
  "docs/03-analysis/education-npc-codebuilder.md",
  "docs/03-analysis/education-permission-blocks.md",
  "docs/03-analysis/world-db-native-evidence.md",
  "docs/03-analysis/native-world-differential.md",
  "docs/03-analysis/leveldb-keyspace.md",
  "docs/03-analysis/game-design-audit-checklist.md",
  "docs/03-analysis/observability-runtime.md",
  "docs/03-analysis/npc-dialogue-runtime.md",
  "docs/03-analysis/environment-hazards-runtime.md",
  "docs/03-analysis/validation-runtime.md",
  "docs/03-analysis/map-audit-routing.md",
  "docs/03-analysis/regression-audit-execution.md",
  "docs/03-analysis/input-gesture-runtime.md",
  "docs/03-analysis/interactive-blocks-runtime.md",
  "docs/03-analysis/knowledge-layer.md",
  "docs/03-analysis/state-scope.md",
  "docs/03-analysis/dialogue-scene-graph.md",
  "docs/03-analysis/project-model.md",
  "docs/03-analysis/forward-ground-truth-intake.md",
  "docs/03-analysis/command-effects.md",
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
  "docs/05-validation/reliability-strategy.md",
  "docs/05-validation/reliability-catalogs.md",
  "docs/05-validation/map-fingerprint.md",
  "docs/05-validation/update-intelligence.md",
  "docs/05-validation/version-aware-native-correlation.md",
  "docs/05-validation/blindspot-portfolio.md",
  "docs/05-validation/map-audit-benchmark-quality.md",
  "docs/05-validation/generative-multiplayer.md",
  "docs/05-validation/regression-session-report.md",
  "docs/05-validation/bedrock-runtime-emitter.md",
  "docs/05-validation/source-mutation-detection.md",
  "docs/05-validation/invariant-revalidation.md",
  "docs/06-system/integrated-analysis.md",
  "docs/06-system/orchestration.md",
  "docs/06-system/skill-contract.md",
  "docs/06-system/context-efficiency.md",
  "docs/04-repair/application.md",
  "docs/04-repair/filesystem-safety.md",
  "docs/04-repair/orchestrated-planning.md",
  "docs/04-repair/topology-planning.md",
  "docs/04-repair/typed-effects.md",
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
  "docs/03-analysis/full-map-reaudit-queue.json",
  "docs/03-analysis/runtime-test-queue.json",
  "docs/03-analysis/regression-detection-corpus.json",
  "docs/03-analysis/runtime-coverage-audit.md",
  "docs/03-analysis/map-audit-schema-migration.md",
  "docs/03-analysis/map-audit-output-v2.json.example",
  "docs/03-analysis/proof-escalation-receipt.schema.json",
  "docs/03-analysis/multi-scenario-check-ledger.schema.json",
  "docs/06-system/contract-registry.json",
];
for (const path of retiredAuthorityPaths) {
  if (existsSync(path)) {
    failures.push("Retired authority path must not exist: " + path);
  }
}

if (existsSync("docs/04-reporting")) {
  failures.push("Retired duplicate docs domain must not exist: docs/04-reporting");
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