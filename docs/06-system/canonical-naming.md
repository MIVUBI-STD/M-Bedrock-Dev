# Canonical Naming

This document defines repository-wide canonical terminology.

## Authorities

| Canonical term | Meaning | Canonical location |
|---|---|---|
| Selected Map Version | Exact `.mcworld` currently being audited; sole current gameplay truth | selected current root artifact |
| Gameplay Contract | Scoped expected behavior derived only from the Selected Map Version | `engine/packages/gameplay-intent/` |
| Actual Behavior | What current source/artifact/runtime does | analyzers + behavior/runtime layers |
| Confirmed Defect | Evidence-proven gameplay contradiction; not user approval | diagnostic/bug-report bridge |
| Approved Bug | Confirmed defect explicitly approved in chat for report/repair flow | `engine/packages/bug-report/src/review.ts` |
| Repair Candidate | Internal technically plausible repair direction; no mutation authority | orchestrator diagnosis/repair reasoning |
| Repair Contract | Must Change + Must Preserve constraints for one authorized repair | preservation/orchestrator repair |
| Authorized Repair | Approved Bug/design change + Repair Contract + current proof | orchestrator repair admission |
| Design System | Schema, vocabulary, templates, compiler for Game Design | `engine/design/` |
| Game Design Spec | Typed model/loader/compiler package | `engine/packages/game-design-spec/` |
| Platform Knowledge | Descriptive Minecraft Bedrock/Education facts | `engine/knowledge/` + `engine/packages/knowledge/` |
| Platform Rule | Executable/versioned capability decision | `engine/rules/` |
| Behavior Contract | Target-specific authored runtime constraints | `engine/packages/behavior-model/` + inspection target |
| Engineering Contract | Global MIVUBI implementation/validation constraints | `engine/contracts/engineering/` |
| Gameplay Intent | Reconstructed intent from authored artifact evidence | `engine/packages/gameplay-intent/` |
| Gameplay Semantic Model | Canonical gameplay meaning projection | orchestrator `gameplaySemantic` |
| Engineering Assessment | Canonical QA/engineering projection | orchestrator `engineeringAssessment` |
| Runtime Evidence | What was observed in Minecraft/runtime | runtime/telemetry/probe layers |
| Audit Obligation | Unresolved audit/model/proof work that is not yet a gameplay finding | orchestrator `auditObligations[]` |
| Blocking Proof | Evidence that prevents the exact suspected causal path | gameplay defect resolution / counter-proof search |
| Runtime Verification | Narrow final runtime check for an irreducible native-behavior question | validation plan / runtime proof |
| Physical Containment Proof | Geometry/collision proof that decides whether a player-sized path can leave an enclosure | orchestrator arena voxel proof |

## Operator workflow vocabulary

Use these terms in human-facing workflow:

```text
Selected Map Version
→ Gameplay Contract
→ Actual Behavior
→ Confirmed Defect
→ Approved Bug
→ Repair Contract
→ Authorized Repair
→ Verification
```

Internal terms such as Gameplay Intent, `repair-eligible`, causal proof state, semantic keys, and evidence IDs stay internal unless technical detail is requested.

Do not use `Confirmed Defect` and `Approved Bug` interchangeably.

## Filesystem disambiguation

Several domains intentionally have a data/source owner and a reusable typed package. When referring to them in prose, use the qualified term rather than the bare folder name.

| Qualified term | Responsibility | Path |
|---|---|---|
| Platform Knowledge Catalog | versioned evidence-backed Minecraft facts/data | `engine/knowledge/` |
| Platform Knowledge Package | claim loading, applicability, freshness, typed knowledge contracts | `engine/packages/knowledge/` |
| Reliability Catalog/History | durable regression, update, capability, and campaign evidence | `engine/reliability/` |
| Reliability Package | reusable reliability models, invariants, fingerprints, and retest contracts | `engine/packages/reliability/` |
| Reliability Search Package | bounded search, interleavings, minimization, and detector-quality strategy | `engine/packages/reliability-search/` |
| Diagnostics Analyzer | derives findings from supported analyzer facts | `engine/analyzers/diagnostics/` |
| Diagnostics Contract Package | stable diagnostic contracts and identifiers | `engine/packages/diagnostics/` |
| Gameplay Intent Analyzer | extracts intent signals from authored source evidence | `engine/analyzers/gameplay-intent/` |
| Gameplay Intent Package | typed evidence-backed intent model and grounding rules | `engine/packages/gameplay-intent/` |
| Runtime Harness | bounded Minecraft-facing proof harness content | `engine/runtime/` |
| Runtime Lab Package | controlled experiment contracts, trials, qualification, and provenance | `engine/packages/runtime-lab/` |

These paired owners are not aliases. One owns concrete data/extraction/harness material; the package owner owns reusable typed behavior or contracts.

## Forbidden ambiguous canonical names

Do not introduce new canonical owners/files/types using:

- `project-policy`;
- generic `policy` for Behavior Contracts or Engineering Contracts;
- `game-design` as an engine-global authority directory/package;
- `gameplayWorld` as a new primary consumer model;
- `player-experience`, `entity-systems`, `arena-gameplay`, or `world-runtime` as knowledge-domain folders.

Legacy aliases may remain only when explicitly marked deprecated and resolving to one canonical owner.

## Decision rule

Ask whether a statement would remain true if the map were replaced by a completely different map.

- **No** → selected-map Gameplay Contract / Behavior Contract.
- **Yes, because Minecraft behaves that way** → Platform Knowledge / Platform Rule.
- **Yes, because MIVUBI requires implementations to be safe that way** → Engineering Contract.


## Audit role and spatial vocabulary

Canonical role labels:

```text
Player
Builder
Roommaster / Operator
Developer / Maintenance
```

Canonical spatial-bound labels:

```text
Loading Bounds
Simulation Bounds
Gameplay Bounds
Physical Collision Bounds
Session Ownership Bounds
```

These names are deliberately non-interchangeable. Source-native identifiers such as `admin` remain valid in evidence/code references, but human-facing audit language maps them to the appropriate canonical role.

Detailed audit status, role, proof, and bound naming is owned by:

`docs/03-analysis/map-audit-naming-contract.md`
