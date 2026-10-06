---
id: document.system.canonical-naming
class: DOCUMENT
domain: system
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Canonical Naming

This document defines repository-wide canonical terminology.

## Repository domain vocabulary

Use these names consistently:

| Domain | Canonical meaning |
|---|---|
| `apps/` | user-facing executable surfaces |
| `engine/` | product implementation and executable semantics |
| `docs/` | durable human-facing guides, architecture, reference, and specifications |
| `planning/` | development, operations, and project work intent |
| `workspace/` | working artifacts, project execution data, continuity, and canonical current report handoff |
| `experiments/` | bounded non-authoritative research |
| `tooling/` | repository/build/developer verification tooling |
| `.agents/` | bounded agent procedures, routing, permissions, and evals |

Do not use `workspace` as a synonym for backlog/planning. Do not use `docs` as a store for current work state. Do not use `planning` as proof, gameplay truth, or execution-state authority.

### Planning vocabulary

```text
planning/development.md → improve M-Bedrock-Dev itself
planning/operations.md  → operate/maintain across projects
planning/projects.md    → concise project-specific continuation intent
```

Avoid parallel names such as `todo`, `next-to-do`, `current-work`, `misc`, `latest`, or `final` as planning owners.

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

`docs/analysis/map-audit-naming-contract.md`

## Knowledge architecture vocabulary

These terms have one repository-wide meaning. Do not introduce aliases for the same responsibility.

| Term | Canonical meaning |
|---|---|
| Catalog | structured collection of registered resources or facts |
| Graph | typed relationships between registered resources |
| Router | deterministic selection of the first canonical owner/domain |
| Retrieval | bounded selection and ranking of relevant registered resources |
| Context | minimum evidence/content package supplied to reasoning or execution |
| Owner | single canonical authority for one responsibility |
| History | chronological execution evidence; never current authority |
| Corpus | reusable/frozen evaluation material |
| Planning | current/future work intent |
| Workspace | current project execution data and working artifacts |

Qualified forms preserve the same meaning. For example, `Reliability Catalog`, `Platform Knowledge Catalog`, and `Resource Catalog` are all catalogs; the qualifier identifies the domain, not a different concept.

Forbidden architectural aliases for these concepts include:

```text
Registry / Directory / Index Database     → Catalog
Knowledge Graph Manager / Link Graph      → Graph
Dispatcher / Resolver                     → Router
RAG Manager / Semantic Search Manager     → Retrieval
Context Pack / Memory Bundle              → Context
Master / Golden / Primary Owner           → Owner
Archive Log / Execution Log Store         → History
Benchmark Dataset / Evaluation Dataset    → Corpus
Todo / Backlog Store / Current Work       → Planning
Active State Store / Project Memory       → Workspace
```

The forbidden terms may still appear when they describe an external API/library concept or a source-native identifier, but they must not become new canonical repository responsibilities.

### Resource classes

Every registered knowledge-architecture resource uses exactly one class:

```text
DOCUMENT
KNOWLEDGE
SOURCE
RELIABILITY
WORKFLOW
SCHEMA
```

Do not add synonymous classes such as NOTE, PAGE, ARTICLE, RESOURCE, CONTENT, or DOC_NODE.

### Document roles

Every registered document uses exactly one role:

```text
ROUTER
WORKFLOW
CONTRACT
REFERENCE
ARCHITECTURE
GUIDE
```

These roles are mutually exclusive at registration time. A document can discuss another role without acquiring it.

Do not introduce PROCEDURE, PLAYBOOK, HANDBOOK, MANUAL, SPEC, or PROTOCOL as parallel role names. Existing filenames may retain historical wording until a deliberate rename is justified; the registered role remains canonical.

### Authority classes

Every registered resource uses exactly one authority class:

```text
CANONICAL
REFERENCE
HISTORICAL
DERIVED
```

Meaning:

- `CANONICAL` — owns the current rule/state/contract for its concern.
- `REFERENCE` — evidence-backed supporting information consumed by canonical owners.
- `HISTORICAL` — past execution or incident evidence; search pressure only.
- `DERIVED` — rebuildable projection/index/cache generated from other owners.

Do not introduce PRIMARY, MASTER, GOLDEN, OFFICIAL, or SOURCE_OF_TRUTH as alternative authority-class values.

### Relation types

The knowledge graph uses only these relation types unless a genuinely new invariant cannot be represented:

```text
ROUTES_TO
OWNS
IMPLEMENTS
USES
DEPENDS_ON
VALIDATES
RELATES_TO
DERIVED_FROM
```

Relation names are directional and semantic. Do not create synonyms such as CONSUMES for USES, BACKED_BY for DERIVED_FROM, or REFERENCES for RELATES_TO.

### Resource identity

Registered IDs are semantic and readable:

```text
<class>.<domain>.<name>
```

Examples:

```text
document.analysis.player-lifecycle
knowledge.world.chunks
source.orchestrator.map-audit
reliability.regression.multi-arena-concurrency
workflow.audit.selected-map
schema.bug-report.v2
```

Rules:

- lowercase;
- dot-separated semantic segments;
- stable across file relocation;
- no sequential numeric IDs;
- no `new`, `latest`, `final`, `v2` suffix unless the version is part of the actual schema/product identity;
- one ID resolves to one resource;
- one resource has one ID.

Path is location. ID is identity. They are not interchangeable.

## Data lifecycle vocabulary

Resource lifecycle uses one state vocabulary:

```text
ACTIVE
RETIRED
```

Resource management follows one process:

```text
Discover
→ Classify
→ Register
→ Relate
→ Validate
→ Consume
→ Update
→ Retire
```

Definitions:

- Discover — detect a new resource/fact/capability.
- Classify — assign class, domain, role when applicable, and authority.
- Register — assign one stable ID and owner/path.
- Relate — add only typed graph relationships required for retrieval/impact.
- Validate — verify identity, ownership, relationships, applicability, and consumers.
- Consume — make the resource reachable from Router/Retrieval or executable consumers.
- Update — modify the existing owner/resource rather than creating an alias/copy.
- Retire — remove it from active routing/consumption; Git History preserves superseded repository content when no current artifact is needed.

Do not create lifecycle states such as OLD, LEGACY, DEPRECATED, SUPERSEDED, ARCHIVED, or INACTIVE as parallel registry states. Domain-specific version/deprecation semantics may exist inside the owned data, but resource lifecycle remains ACTIVE or RETIRED.