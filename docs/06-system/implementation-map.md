# Implementation Map

Use this before broad repository search.

| Responsibility | Canonical owner |
|---|---|
| Shared dependency-neutral primitives | engine/packages/common/ |
| Artifact kind/identity/fingerprint | engine/packages/artifact/ |
| ZIP/archive safety, inventory, package transport | engine/packages/archive/ |
| Workspace/session/file inventory + telemetry data contracts | engine/packages/project-model/ |
| Drive storage root + exact map/current-world pointers | engine/packages/project-model/src/project/drive-binding.ts + workspace/drive-root.json |
| Runtime semantic attribute convention | engine/packages/project-model/src/runtime/runtime-semantic-convention.ts |
| Runtime telemetry emission helpers / sinks / instrumentation guards | engine/packages/telemetry/ |
| Semantic dependency graph/invalidation | engine/packages/graph/ |
| Repository capability dependencies, domain path ownership, affected closure, execution planning | engine/packages/task-graph/ |
| Minimum-sufficient evidence/capability planning | engine/packages/analysis-planner/ |
| Execution/state/temporal Semantic IR contracts and queries | engine/packages/semantic-ir/ |
| Parser-independent value-flow graph + forward/backward semantic slicing | engine/packages/dataflow/ |
| JavaScript/TypeScript direct interprocedural value-flow extraction | engine/analyzers/scripts/src/flow/dataflow.ts |
| Minecraft semantic source/sink bindings over value flow | engine/analyzers/scripts/src/flow/semantic-flow-bindings.ts |
| Semantic source→sink taint witness | engine/analyzers/scripts/src/flow/semantic-flow-witness.ts |
| Bundled/minified source-shape recovery + source-map discovery | engine/analyzers/scripts/src/recovery/source-recovery.ts |
| Source-map generated→original binding | engine/analyzers/scripts/src/recovery/source-map-binding.ts |
| Compact data-flow context slice for diagnosis/AI context | engine/packages/orchestrator/src/inspection/script-dataflow-context.ts |
| Evidence-backed gameplay intent graph, authored invariants, state/model closure, unknowns, intent grounding, and domain-specific authority resolution | engine/packages/gameplay-intent/ |
| Canonical gameplay surface discovery + Discovery Closure | engine/packages/orchestrator/src/inspection/gameplay-surface-discovery.ts + gameplay-discovery-closure.ts |
| Canonical gameplay semantic projection | engine/packages/orchestrator/src/inspection/gameplay-semantic-model.ts |
| Risk-directed gameplay analysis priority | engine/packages/orchestrator/src/inspection/gameplay-analysis-priority.ts |
| Reachability/capability orchestration | engine/packages/orchestrator/src/inspection/gameplay-reachability-stage.ts + capability-exposure-stage.ts |
| Hidden gameplay defect orchestration | engine/packages/orchestrator/src/inspection/hidden-gameplay-defect-analysis.ts |
| Canonical map engineering/QA assessment projection | engine/packages/orchestrator/src/inspection/map-engineering-assessment.ts |
| Gameplay world composition / closure integration | engine/packages/orchestrator/src/inspection/gameplay-world-model.ts |
| Formal behavioral state/transition/temporal property kernel + Minecraft overlays | engine/packages/behavior-model/ |
| Constraint-backed reachability, invariant proof, and counterexample traces | engine/packages/logic-solver/ |
| Competing hypotheses, falsifiers, negative-space/temporal reasoning, reachability, capability exposure, contradiction registry, risk-directed proof depth, and diagnostic probe discrimination | engine/packages/diagnostic-reasoning/ |
| Gameplay-critical candidate discovery + counter-evidence suppression | engine/packages/diagnostic-reasoning/src/candidate-evidence.ts |
| Diagnostic contract/IDs | engine/packages/diagnostics/ |
| Validation step/result contracts | engine/packages/validation/ |
| Bug Report V2 semantics/lifecycle; V1 import compatibility only | engine/packages/bug-report/ + engine/schemas/bug-report/ |
| Proposed Bug Set chat-review / approval boundary | engine/packages/bug-report/src/review.ts |
| Canonical persisted bug-report current state | workspace/reports/*.json |
| Bug-report ownership/storage boundary | docs/06-system/bug-report-ownership.md |
| Approved Bug Report V2 client projection + quality gate | engine/packages/bug-report/src/document/ + engine/packages/bug-report/DOCUMENT.md |
| Compact ChatGPT/Markdown bug-report preview | engine/packages/bug-report/src/preview.ts + engine/packages/bug-report/PREVIEW.md |
| Self-contained Map Audit Report + Approved Bug Report V2 HTML rendering | tooling/bug-report-documents/render.ts |
| Optional Bug Report UI viewer | apps/bug-report-ui/ (projection only; not report authority) |
| Repair preservation contracts, baselines, and verification receipts | engine/packages/preservation/ |
| Reliability invariants/fingerprint/update delta/retest/runtime evidence | engine/packages/reliability/ |
| Capability-specific proof binding registry | engine/reliability/catalogs/capability-proof-bindings.json |
| Reliability evidence router / ownership boundary | engine/reliability/README.md |
| Calibration / blind acceptance / regression benchmark manifests | engine/reliability/corpus/ |
| Runtime session recording/replay contract + first divergence | engine/packages/reliability/src/runtime/runtime-session-replay.ts |
| Reliability search/corpus/interleavings/minimization | engine/packages/reliability-search/ |
| Cross-map behavioral pattern aggregation | engine/packages/reliability-search/src/corpus/behavioral-pattern-library.ts |
| Metamorphic detector testing | engine/packages/reliability-search/src/robustness/metamorphic.ts |
| Parser robustness campaigns | engine/packages/reliability-search/src/robustness/parser-robustness.ts |
| Coverage-quality dashboard + generated known-limits | engine/packages/reliability-search/src/coverage/coverage-quality-dashboard.ts + coverage/generated-known-limits.ts |
| Empirical diagnostic calibration | engine/packages/diagnostic-reasoning/src/calibration.ts |
| Controlled Minecraft experiment planning/qualification/provenance | engine/packages/runtime-lab/ + engine/runtime/lab/ |
| Cross-version runtime differential planning/receipt | engine/packages/runtime-lab/src/differential/cross-version-differential-plan.ts |
| Cross-version runtime differential executor over RuntimeExperimentHost | engine/packages/runtime-lab/src/differential/cross-version-differential-executor.ts |
| Compatibility engine/version/track contracts | engine/packages/compatibility/ |
| Exact target Minecraft runtime identity and inventory completeness | engine/packages/runtime-profile/ |
| Runtime-profile → compatibility query adapter | engine/packages/compatibility/src/runtime-profile-adapter.ts |
| Game Design specification schema/loader/compiler | engine/packages/game-design-spec/ + engine/design/ |
| Selected-artifact Gameplay Contract / readiness | engine/packages/gameplay-intent/ |
| Mandatory gameplay audit procedure / checkpoint semantics | docs/03-analysis/mandatory-audit-procedure.md |
| Mandatory audit procedure machine-readable projection / closure | engine/packages/orchestrator/src/inspection/mandatory-audit-procedure.ts |
| Rich state/ownership/progression audit projections | engine/packages/orchestrator/src/inspection/mandatory-audit-support.ts |
| Production selected-map audit single entry + canonical continuations | engine/packages/orchestrator/src/map-audit-pipeline.ts (exact .mcworld → artifact proof → ordered audit → resolveSelectedMapAudit when needed → internal SelectedMapAuditRun) |
| User prompt intake / non-authoritative search guidance / additive analysis demand | engine/packages/orchestrator/src/map-audit-user-intent.ts + docs/03-analysis/user-input-translation-contract.md + .agents/skills/m-bedrock-map-bug-audit/SKILL.md |
| Pre-Audit Plan confirmation / stale-confirmation guard | engine/packages/orchestrator/src/map-audit-user-intent.ts (`createAuditUserIntentConfirmationRequest`, `confirmAuditUserIntent`, `validateAuditUserIntentConfirmation`) + map-audit-pipeline.ts admission prerequisite |
| Sole operator-facing selected-map audit output | engine/packages/orchestrator/src/map-audit-output-v2.ts (SelectedMapAuditRun internal authority → Map Audit Output V2) |
| Opaque production reporting authority / raw collector bypass guard | engine/packages/orchestrator/src/map-audit-authority.ts + reporting/report-defect-collector.ts |
| Ordered production audit admission / first blocking stage (reads Mandatory Audit Procedure checkpoints only) | engine/packages/orchestrator/src/map-audit-admission.ts |
| Typed directional gameplay-scenario component traversal / semantic stop boundaries | engine/packages/orchestrator/src/inspection/gameplay-scenario-knowledge.ts |
| Bounded model-facing audit task packets / next-action / evidence+RIG context projection | engine/packages/orchestrator/src/map-audit-model-task.ts |
| Canonical continuation ownership / rerun-vs-resolve-vs-review contract | engine/packages/orchestrator/src/map-audit-pipeline.ts (SelectedMapAuditRun.continuation) |
| Selected-artifact identity binding through review/report | engine/packages/orchestrator/src/map-audit-identity.ts |
| Production runtime-target boundary / reject caller map-design contracts | engine/packages/orchestrator/src/map-audit-pipeline.ts (SelectedMapAuditRuntimeTarget) |
| Deterministic confirmed resolution → PROVEN / confirmation-ready NEED_VALIDATION issue projection | engine/packages/orchestrator/src/map-audit-issue-projection.ts + map-audit-validation-projection.ts |
| Unresolved audit/model/proof residue that is not yet a gameplay issue | engine/packages/orchestrator/src/map-audit-obligations.ts (`auditObligations[]`) |
| Deterministic pre-report AI candidate grouping + coverage enforcement | engine/packages/orchestrator/src/map-audit-candidate-grouping.ts |
| Canonical confirmed-defect root-cause grouping | engine/packages/bug-report/src/grouping.ts (broken invariant + repair unit + primary failure) |
| Bounded counter-proof search receipt / confirmed-defect admission | engine/packages/orchestrator/src/inspection/gameplay-defect-resolution.ts |
| AI candidate Expected/Actual narrative binding to ready resolutions | engine/packages/orchestrator/src/reporting/report-defect-collector.ts |
| Audit snapshot revision / stale model-result + review/report rejection | engine/packages/orchestrator/src/map-audit-revision.ts + map-audit-pipeline.ts |
| Audit-revision-bound semantic proof reuse | engine/packages/orchestrator/src/workflow/semantic-proof-cache.ts (audit-bound wrapper) |
| Audit-revision-bound rejected-candidate reuse | engine/packages/orchestrator/src/reporting/report-candidate-reuse.ts (audit-bound wrapper) |
| Bounded preflight → final RIG demand reconciliation (max 2 full artifact passes) | engine/packages/orchestrator/src/map-audit-demand-reconciliation.ts + map-audit-pipeline.ts |
| Audit-authoritative Work Session projection + persistence mirror | engine/packages/orchestrator/src/workflow/map-audit-work-session.ts + engine/packages/project-model/src/session/work-session.ts |
| Evidence collection vs ordered decision authorization | engine/packages/orchestrator/src/map-audit-execution-trace.ts |
| Gameplay bug audit workflow | .agents/skills/m-bedrock-map-bug-audit/ |
| Approved bug repair + preservation workflow | .agents/skills/m-bedrock-target-repair/ + docs/04-repair/ |
| Versioned evidence-backed Minecraft platform knowledge and applicability | engine/packages/knowledge/ + engine/knowledge/ |
| Applicable platform relation claims in audit/model context | inspection/knowledge-runtime-analysis.ts → gameplay-world-model.ts → map-audit-model-task.ts |
| Knowledge source freshness/quarantine | engine/packages/knowledge/src/freshness.ts |
| Declarative evidence-based diagnostic rules | engine/packages/diagnostic-reasoning/src/declarative-rules.ts |
| Engineering/validation contracts | engine/contracts/engineering/ |
| Education edition/feature profile | engine/packages/compatibility/education* |
| Repair transactions/preconditions/application | engine/packages/repair/ |
| Repair workflow authority / Approved Bug mutation gate | engine/packages/orchestrator/src/repair/repair-admission-pipeline.ts + repair-proof-bundle.ts |
| Cross-owner inspect/repair-validation orchestration | engine/packages/orchestrator/ |
| Fail-closed repository task planning | engine/packages/orchestrator/src/workflow/repository-task-plan.ts |
| Affected semantic/context compression for Codex | engine/packages/orchestrator/src/workflow/semantic-affected-plan.ts + workflow/context-compiler.ts |
| Arena lifecycle + cleanup convergence | engine/packages/orchestrator/src/arena/arena-lifecycle-* + arena/arena-cleanup-* |
| Spatial gameplay authority | engine/packages/behavior-model/src/minecraft/spatial-authority.ts + engine/packages/orchestrator/src/inspection/spatial-authority-* |
| Inventory/equipment lifecycle + item Behavior Contract | engine/packages/behavior-model/src/minecraft/inventory-* + engine/packages/orchestrator/src/inspection/inventory-* |
| Entity AI/navigation source readiness + route environment | engine/analyzers/entities/ + engine/packages/orchestrator/src/inspection/entity-ai-* + inspection/route-navigation-* |
| Scenario-scoped entity/navigation + structure contradiction projection | gameplay-world-model.ts + gameplay-scenario-compiler.ts |
| Combat/downed/revive Behavior Contract and lifecycle | engine/packages/behavior-model/src/minecraft/combat-* + engine/packages/orchestrator/src/inspection/combat-* + engine/packages/telemetry/src/domains/revive/revive-* |
| Chunk lifecycle/readiness/lease reasoning | engine/packages/behavior-model/src/minecraft/chunk.ts + engine/packages/orchestrator/src/inspection/chunk-* |
| Economy/reward source arbitration | engine/packages/behavior-model/src/minecraft/economy-* + engine/packages/orchestrator/src/inspection/economy-* + inspection/reward-source-analysis.ts |
| Generic Bedrock NBT transport | engine/adapters/nbt/ |
| mcstructure semantic normalization | engine/adapters/mcstructure/ |
| Bedrock LevelDB snapshot/transport | engine/adapters/leveldb/ |
| World DB semantic decoding | engine/analyzers/world-db/ |
| Script source/module/capability analysis | engine/analyzers/scripts/ |
| Entity behavior/navigation/targeting/loot semantics | engine/analyzers/entities/ |
| Gameplay-intent signal extraction from selected-artifact source evidence | engine/analyzers/gameplay-intent/ |
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
