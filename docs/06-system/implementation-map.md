# Implementation Map

Use this before broad repository search.

| Responsibility | Canonical owner |
|---|---|
| Shared dependency-neutral primitives | packages/common/ |
| Artifact kind/identity/fingerprint | packages/artifact/ |
| ZIP/archive safety, inventory, package transport | packages/archive/ |
| Workspace/session/file inventory + telemetry data contracts | packages/project-model/ |
| Runtime telemetry emission helpers / sinks / instrumentation guards | packages/telemetry/ |
| Semantic dependency graph/invalidation | packages/graph/ |
| Diagnostic contract/IDs | packages/diagnostics/ |
| Validation step/result contracts | packages/validation/ |
| Reliability invariants/fingerprint/update delta/retest/runtime evidence | packages/reliability/ |
| Reliability search/corpus/interleavings/minimization | packages/reliability-search/ |
| Compatibility engine/version/track contracts | packages/compatibility/ |
| Education edition/feature profile | packages/compatibility/education* |
| Repair transactions/preconditions/application | packages/repair/ |
| Cross-owner inspect/repair-validation orchestration | packages/orchestrator/ |
| Generic Bedrock NBT transport | adapters/nbt/ |
| mcstructure semantic normalization | adapters/mcstructure/ |
| Bedrock LevelDB snapshot/transport | adapters/leveldb/ |
| World DB semantic decoding | analyzers/world-db/ |
| Script source/module/capability analysis | analyzers/scripts/ |
| File/path discovery | analyzers/discovery/ |
| Manifest semantics + compatibility fact extraction | analyzers/manifest/ |
| Function source/reference extraction | analyzers/functions/ |
| Command semantics/effects | analyzers/commands/ |
| Reference resolution | analyzers/references/ |
| Derived diagnostics | analyzers/diagnostics/ |
| Coordinate/topology derivation | analyzers/topology/ |
| Regression fixtures | fixtures/regressions/ |
| Versioned Bedrock/Education capability data | rules/ |
| Structural/internal schemas | schemas/ |
| Thin user interfaces | apps/ |
| Root developer routing | DEV.cmd → tooling/windows-toolchain/dev.ps1 |
| Repository/source boundary verification | tooling/repository/ |
| Stable project facts | CONTEXT.md |
| GitHub execution | GITHUB_RULES.md |
| Current continuation | docs/07-operations/next-action.md |
| Current proof | docs/07-operations/current-validation.md |
| Research | Experimental/ |

Use docs/06-system/architecture.md for enforceable dependency direction.
