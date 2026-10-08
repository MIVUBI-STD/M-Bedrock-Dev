---
id: document.system.implementation-map
class: DOCUMENT
domain: system
role: GUIDE
authority: CANONICAL
lifecycle: ACTIVE
---

# Implementation Map

Human-readable routing map for implementation ownership.

This file is intentionally high-level. It is **not** a manually maintained database of every source file or symbol.

Exact implementation lookup follows:

```text
Task / concern
→ Router
→ Resource Catalog
→ ownership.json
→ targeted source lookup
```

Machine-readable ownership and current source win if this overview becomes stale.

## Engine domains

| Concern | Canonical implementation owner |
|---|---|
| Artifact identity / fingerprint | `engine/packages/artifact/` |
| Archive / ZIP safety and deterministic transport | `engine/packages/archive/` |
| Shared dependency-neutral primitives | `engine/packages/common/` |
| Project/workspace/session models | `engine/packages/project-model/` |
| Semantic dependency graph / invalidation | `engine/packages/graph/` |
| Semantic execution/state representation | `engine/packages/semantic-ir/` |
| Parser-independent value/data flow | `engine/packages/dataflow/` |
| Platform knowledge contracts/applicability | `engine/packages/knowledge/` + `engine/knowledge/` |
| Gameplay intent / selected-artifact expected behavior | `engine/packages/gameplay-intent/` |
| Behavioral state/transition/temporal model | `engine/packages/behavior-model/` |
| Compatibility / edition / capability | `engine/packages/compatibility/` |
| Runtime target identity | `engine/packages/runtime-profile/` |
| Diagnostic contracts | `engine/packages/diagnostics/` |
| Diagnostic reasoning / hypotheses / counter-evidence | `engine/packages/diagnostic-reasoning/` |
| Constraint/reachability reasoning | `engine/packages/logic-solver/` |
| Minimum-sufficient analysis planning | `engine/packages/analysis-planner/` |
| Diagnosis execution/reuse | `engine/packages/diagnosis-pipeline/` |
| Repair mutation | `engine/packages/repair/` |
| Preservation contracts/proof | `engine/packages/preservation/` |
| Validation contracts/results | `engine/packages/validation/` |
| Runtime telemetry | `engine/packages/telemetry/` |
| Controlled runtime experiments | `engine/packages/runtime-lab/` + `engine/runtime/` |
| Reliability models/fingerprints/retest | `engine/packages/reliability/` |
| Reliability search/minimization/robustness | `engine/packages/reliability-search/` |
| Repository affected-work planning | `engine/packages/task-graph/` |
| Cross-owner composition / production workflows | `engine/packages/orchestrator/` |
| Approved Bug Report V2 | `engine/packages/bug-report/` |
| Game Design specification | `engine/packages/game-design-spec/` + `engine/design/` |

Canonical package grouping is machine-readable in:

```text
engine/packages/ownership.json
```

## Analyzer domains

| Concern | Canonical analyzer owner |
|---|---|
| File/content discovery | `engine/analyzers/discovery/` |
| Manifest semantics | `engine/analyzers/manifest/` |
| mcfunction parsing | `engine/analyzers/functions/` |
| Command semantics | `engine/analyzers/commands/` |
| Script / TypeScript semantics | `engine/analyzers/scripts/` |
| Dialogue semantics | `engine/analyzers/dialogue/` |
| Entity authored state | `engine/analyzers/entities/` |
| Gameplay intent extraction | `engine/analyzers/gameplay-intent/` |
| Reference resolution | `engine/analyzers/references/` |
| Spatial/topology analysis | `engine/analyzers/topology/` |
| Native world DB evidence | `engine/analyzers/world-db/` |
| Derived diagnostics | `engine/analyzers/diagnostics/` |

Canonical grouping:

```text
engine/analyzers/ownership.json
engine/adapters/ownership.json
```

## Data and evidence owners

| Data | Canonical owner |
|---|---|
| Minecraft platform/runtime facts | `engine/knowledge/` |
| Engineering contracts | `engine/contracts/engineering/` |
| Reliability catalogs | `engine/reliability/catalogs/` |
| Frozen evaluation corpus | `engine/reliability/corpus/` |
| Historical execution evidence | `engine/reliability/history/` |
| Regression fixtures | `engine/fixtures/regressions/` |
| Current project continuity | `workspace/projects/` |
| Current Bug Report V2 | `workspace/projects/<project-id>/report/` (or level-scoped report) |
| Current Developer Notes | `workspace/projects/<project-id>/report/developer-notes.json` (or level-scoped report) |
| Work intent | `planning/` |

## Critical selected-map audit entrypoints

These exact source entrypoints are intentionally listed because they define production workflow authority.

| Responsibility | Source owner |
|---|---|
| Production selected-map audit entry / continuation | `engine/packages/orchestrator/src/map-audit-pipeline.ts` |
| User intent / pre-audit confirmation | `engine/packages/orchestrator/src/map-audit-user-intent.ts` |
| Ordered stage admission | `engine/packages/orchestrator/src/map-audit-admission.ts` |
| Operator-facing Map Audit Output V2 | `engine/packages/orchestrator/src/map-audit-output-v2.ts` |
| Audit obligations | `engine/packages/orchestrator/src/map-audit-obligations.ts` |
| Model-facing bounded task context | `engine/packages/orchestrator/src/map-audit-model-task.ts` |
| Work Session audit projection | `engine/packages/orchestrator/src/workflow/map-audit-work-session.ts` |
| Report candidate collection | `engine/packages/orchestrator/src/reporting/report-defect-collector.ts` |
| Bug review / approval | `engine/packages/bug-report/src/review.ts` |
| Repair admission | `engine/packages/orchestrator/src/repair/repair-admission-pipeline.ts` |

Human workflow owners:

- [Master Selected-Map Audit Workflow](../analysis/master-selected-map-audit-workflow.md)
- [Mandatory Gameplay Audit Procedure](../analysis/mandatory-audit-procedure.md)
- [Bug-Finding Coverage](../analysis/bug-finding-coverage.md)

## Knowledge access owners

```text
Router
→ docs/README.md + domain README

Catalog
→ tooling/repository/resource-catalog.mjs

Graph
→ tooling/repository/graph.mjs

Retrieval
→ `engine/packages/analysis-planner/src/retrieval.ts`
→ repository entrypoint: `tooling/repository/retrieve.ts`
→ section ranking: `engine/packages/analysis-planner/src/section-retrieval.ts`
→ repository lexical scoring: `tooling/repository/lexical-retrieval.mjs`

Context
→ `engine/packages/orchestrator/src/workflow/context-compiler.ts` + `resource-context.ts`
```

Catalog and Graph are derived navigation structures. They never replace the source/data owners listed above.

## Exact lookup rule

Do not expand this document back into a per-symbol or per-file database.

For an exact implementation question:

1. resolve the concern through the appropriate Router;
2. resolve registered resources through the Resource Catalog;
3. inspect the matching machine-readable ownership file;
4. search only the selected owner/module;
5. read the minimum source required to decide the question.

If a responsibility cannot be resolved through this path, fix ownership/routing metadata rather than adding another row of ad-hoc implementation trivia here.