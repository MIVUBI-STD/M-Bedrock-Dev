# Implementation Map

Use this before broad repository search.

| Responsibility | Canonical owner |
|---|---|
| Shared dependency-neutral primitives | engine/packages/common/ |
| Artifact kind/identity/fingerprint | engine/packages/artifact/ |
| ZIP/archive safety, inventory, package transport | engine/packages/archive/ |
| Workspace/session/file inventory + telemetry data contracts | engine/packages/project-model/ |
| Runtime semantic attribute convention | engine/packages/project-model/src/runtime-semantic-convention.ts |
| Runtime telemetry emission helpers / sinks / instrumentation guards | engine/packages/telemetry/ |
| Semantic dependency graph/invalidation | engine/packages/graph/ |
| Repository capability dependencies, domain path ownership, affected closure, execution planning | engine/packages/task-graph/ |
| Minimum-sufficient evidence/capability planning | engine/packages/analysis-planner/ |
| Execution/state/temporal Semantic IR contracts and queries | engine/packages/semantic-ir/ |
| Parser-independent value-flow graph + forward/backward semantic slicing | engine/packages/dataflow/ |
| JavaScript/TypeScript direct interprocedural value-flow extraction | engine/analyzers/scripts/src/dataflow.ts |
| Minecraft semantic source/sink bindings over value flow | engine/analyzers/scripts/src/semantic-flow-bindings.ts |
| Bundled/minified source-shape recovery + source-map discovery | engine/analyzers/scripts/src/source-recovery.ts |
| Source-map generated→original binding | engine/analyzers/scripts/src/source-map-binding.ts |
| Compact data-flow context slice for diagnosis/AI context | engine/packages/orchestrator/src/script-dataflow-context.ts |
| Evidence-backed gameplay intent graph, authored invariants, unknowns, and intent grounding | engine/packages/gameplay-intent/ |
| Canonical gameplay semantic projection | engine/packages/orchestrator/src/gameplay-semantic-model.ts |
| Canonical map engineering/QA assessment projection | engine/packages/orchestrator/src/map-engineering-assessment.ts |
| Legacy mixed gameplay/engineering compatibility projection | engine/packages/orchestrator/src/gameplay-world-model.ts |
| Formal behavioral state/transition/temporal property kernel + Minecraft overlays | engine/packages/behavior-model/ |
| Constraint-backed reachability, invariant proof, and counterexample traces | engine/packages/logic-solver/ |
| Competing hypotheses, falsifiers, and diagnostic probe discrimination | engine/packages/diagnostic-reasoning/ |
| Diagnostic contract/IDs | engine/packages/diagnostics/ |
| Validation step/result contracts | engine/packages/validation/ |
| Bug Report V2 canonical tracker contract/export; V1 import compatibility only | engine/packages/bug-report/ + engine/schemas/bug-report/ |
| Repair preservation contracts, baselines, and verification receipts | engine/packages/preservation/ |
| Reliability invariants/fingerprint/update delta/retest/runtime evidence | engine/packages/reliability/ |
| Runtime session recording/replay contract + first divergence | engine/packages/reliability/src/runtime-session-replay.ts |
| Reliability search/corpus/interleavings/minimization | engine/packages/reliability-search/ |
| Cross-map behavioral pattern aggregation | engine/packages/reliability-search/src/behavioral-pattern-library.ts |
| Metamorphic detector testing | engine/packages/reliability-search/src/metamorphic.ts |
| Parser robustness campaigns | engine/packages/reliability-search/src/parser-robustness.ts |
| Coverage-quality dashboard + generated known-limits | engine/packages/reliability-search/src/coverage-quality-dashboard.ts + generated-known-limits.ts |
| Empirical diagnostic calibration | engine/packages/diagnostic-reasoning/src/calibration.ts |
| Controlled Minecraft experiment planning/qualification/provenance | engine/packages/runtime-lab/ + engine/runtime/lab/ |
| Cross-version runtime differential planning/receipt | engine/packages/runtime-lab/src/cross-version-differential-plan.ts |
| Cross-version runtime differential executor over RuntimeExperimentHost | engine/packages/runtime-lab/src/cross-version-differential-executor.ts |
| Compatibility engine/version/track contracts | engine/packages/compatibility/ |
| Exact target Minecraft runtime identity and inventory completeness | engine/packages/runtime-profile/ |
| Runtime-profile → compatibility query adapter | engine/packages/compatibility/src/runtime-profile-adapter.ts |
| Game Design specification schema/loader/compiler | engine/packages/game-design-spec/ + engine/design/ |
| Versioned evidence-backed Minecraft platform knowledge and applicability | engine/packages/knowledge/ + engine/knowledge/ |
| Knowledge source freshness/quarantine | engine/packages/knowledge/src/freshness.ts |
| Declarative evidence-based diagnostic rules | engine/packages/diagnostic-reasoning/src/declarative-rules.ts |
| Engineering/validation contracts | engine/contracts/engineering/ |
| Education edition/feature profile | engine/packages/compatibility/education* |
| Repair transactions/preconditions/application | engine/packages/repair/ |
| Cross-owner inspect/repair-validation orchestration | engine/packages/orchestrator/ |
| Fail-closed repository task planning | engine/packages/orchestrator/src/repository-task-plan.ts |
| Affected semantic/context compression for Codex | engine/packages/orchestrator/src/semantic-affected-plan.ts + context-compiler.ts |
| Arena lifecycle + cleanup convergence | engine/packages/orchestrator/src/arena-lifecycle-* + arena-cleanup-* |
| Spatial gameplay authority | engine/packages/behavior-model/src/minecraft/spatial-authority.ts + engine/packages/orchestrator/src/spatial-authority-* |
| Inventory/equipment lifecycle + item Behavior Contract | engine/packages/behavior-model/src/minecraft/inventory-* + engine/packages/orchestrator/src/inventory-* |
| Entity AI/navigation source readiness + route environment | engine/analyzers/entities/ + engine/packages/orchestrator/src/entity-ai-* + route-navigation-* |
| Combat/downed/revive Behavior Contract and lifecycle | engine/packages/behavior-model/src/minecraft/combat-* + engine/packages/orchestrator/src/combat-* + engine/packages/telemetry/src/revive-* |
| Chunk lifecycle/readiness/lease reasoning | engine/packages/behavior-model/src/minecraft/chunk.ts + engine/packages/orchestrator/src/chunk-* |
| Economy/reward source arbitration | engine/packages/behavior-model/src/minecraft/economy-* + engine/packages/orchestrator/src/economy-* + reward-source-analysis.ts |
| Generic Bedrock NBT transport | engine/adapters/nbt/ |
| mcstructure semantic normalization | engine/adapters/mcstructure/ |
| Bedrock LevelDB snapshot/transport | engine/adapters/leveldb/ |
| World DB semantic decoding | engine/analyzers/world-db/ |
| Script source/module/capability analysis | engine/analyzers/scripts/ |
| Entity behavior/navigation/targeting/loot semantics | engine/analyzers/entities/ |
| Gameplay-intent signal extraction from authored source evidence | engine/analyzers/gameplay-intent/ |
| File/path discovery | engine/analyzers/discovery/ |
| Manifest semantics + compatibility fact extraction | engine/analyzers/manifest/ |
| Function source/reference extraction | engine/analyzers/functions/ |
| Command semantics/effects | engine/analyzers/commands/ |
| Reference resolution | engine/analyzers/references/ |
| Derived diagnostics | engine/analyzers/diagnostics/ |
| Coordinate/topology derivation | engine/analyzers/topology/ |
| Regression fixtures | engine/fixtures/regressions/ |
| Versioned Bedrock/Education capability data | engine/rules/ |
| Structural/internal schemas | engine/schemas/ |
| Thin user interfaces | apps/ |
| Root developer routing | DEV.cmd → tooling/windows-toolchain/dev.ps1 |
| Repository/source boundary verification | tooling/repository/ |
| Stable project facts | CONTEXT.md |
| GitHub execution | GITHUB_RULES.md |
| Current continuation | docs/07-operations/next-action.md |
| Current proof | docs/07-operations/current-validation.md |
| Research | experiments/ |

Use docs/06-system/architecture.md for enforceable dependency direction.
