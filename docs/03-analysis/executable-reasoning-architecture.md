# Executable Knowledge Reasoning Architecture

## Goal

Convert the repository knowledge base from passive documentation into evidence-driven diagnostics without inventing runtime facts.

## Pipeline

```text
project/map analyzers
↓
normalized RuntimeEvidenceRecord[]
↓
group by runtime scope
↓
three-state evidence
  present / absent / unknown
↓
effective knowledge profile
  edition / version / experiments / modules
↓
cross-domain KnowledgeGraph
↓
relation assessment
↓
violation / evidence gap / satisfied
↓
DiagnosticFinding
↓
validation plan
```

## Runtime evidence

Evidence lives in `packages/project-model/src/runtime-evidence.ts`.

Important properties:

- predicate
- present / absent / unknown
- observed / derived / unknown confidence
- SourceRef provenance
- related graph/node ids
- arena/player/entity/operation scope generations

Missing evidence is never converted to explicit absence.

## Knowledge graph

`packages/knowledge/src/graph.ts` creates an effective relation graph after version/edition filtering.

It preserves:

- relation id
- domain
- relation kind
- provenance
- classification
- diagnostic hint

The graph supports outgoing/incoming queries, dependency/consequence lookup, and bounded path discovery.

## Relation evaluator

`packages/knowledge/src/evaluate.ts` evaluates only relations with enough explicit evidence.

Current executable semantics:

- requires
- requires-any
- gates
- deactivates
- restores

Unknown evidence remains unknown.

Other relation kinds stay available in the graph for analyzer-specific reasoning instead of being given unsafe generic semantics.

## Diagnostic templates

`packages/knowledge/src/diagnostics.ts` turns applicable risk surfaces into version-scoped diagnostic templates.

Templates preserve:

- fact id
- domain
- subject
- risk surface
- classification
- confidence
- knowledge provenance
- capability tags

## Runtime diagnostics adapter

`analyzers/diagnostics/src/knowledge-runtime-findings.ts` bridges runtime evidence and knowledge assessments into standard DiagnosticFinding objects.

It emits:

- KNOWLEDGE_RELATION_VIOLATION
- KNOWLEDGE_EVIDENCE_GAP

Conflicting explicit runtime evidence becomes an evidence-gap finding rather than an arbitrary winner.

## Validation planning

`packages/knowledge/src/validation-plan.ts` converts unresolved/violating assessments into future validation cases.

Strategies include:

- static proof
- runtime invariant
- repeatability
- concurrency
- recovery
- manual/GameTest

This does not execute live tests during the current knowledge/analyzer phase.

## Catalog hardening

The catalog loader/verifier now checks:

- JSON parsing context
- source provenance scheme
- registered domains
- registered relation kinds
- classifications
- edition applicability
- script module version shape
- local source references
- project-policy provenance
- duplicate fact/relation ids
- cross-file source conflicts
- fact/relation id collisions

`project://` provenance is valid only for project-policy sources; external engine evidence remains HTTPS-backed.

## Next integration target

Analyzer producers should start emitting normalized predicates for existing high-value facts such as:

```text
structure-placement-request
post-placement-readiness-verification
loaded-target-chunk
verified-location
RESULT_COMMITTED
reward-commit-safe
ending-generation-invalidated
VERIFY_EMPTY
valid-combat-scope
current-dialogue-session
validated-mount-relationship
```

The first integration should target existing analyzers rather than create a new monolithic analyzer:

1. manifest/compatibility
2. command/function context
3. entity transitions
4. structures/world mutation
5. topology/spatial scope
6. diagnostics aggregation

## Safety property

The executable layer follows one rule:

> absence of proof is not proof of absence.

This is necessary for Bedrock because unloaded chunks, deferred entity mutation, client presentation, and partially observable runtime state frequently produce incomplete evidence.


## Implemented evidence producers

The executable reasoning pipeline now has concrete producers for:

- manifest compatibility constraints and script-module dependencies;
- `.mcfunction` command effects;
- structure-load target correlation and chunk-readiness mechanisms;
- topology/spatial effects and outliers;
- Script API/event/dynamic-property/deferred-work evidence;
- entity transition integrity and AI capability surfaces;
- native LevelDB/world-db chunk records as disk evidence only.

### Important evidence boundary

Native LevelDB chunk records deliberately emit predicates such as:

```text
world-db-chunk-record
world-db-block-entity-record
world-db-pending-tick-record
```

They do **not** emit:

```text
loaded-target-chunk
```

because persisted chunk data is not proof that the chunk is currently resident in the running world.

### Current cross-domain proofs

The first executable cross-domain chains now include:

```text
structure command
→ structure-placement-request
→ requires structure-target-resolved
→ structure inventory correlation
→ SATISFIED / VIOLATION
```

and:

```text
structure/block mutation
→ requires runtime readiness proof
→ UNKNOWN when static evidence cannot prove it
→ KNOWLEDGE_EVIDENCE_GAP
→ validation case
```

Entity definitions also emit explicit transition-integrity evidence when undefined event/group references are provable.

## Diagnostic severity

Knowledge relations may now carry a `diagnosticSeverity` hint.

Severity is only applied when a relation is explicitly violated. Unknown evidence remains informational even when the relation would be critical if disproven.

Current high-impact critical relations include:

- structure placement with a definitely missing target;
- world mutation commit without required verification;
- terminal reward before result commit;
- arena reuse before reset verification.

This preserves the distinction between:

```text
PROVEN BAD → ranked severity
UNKNOWN    → evidence gap
```

## Runtime profile handling

The effective knowledge profile no longer silently assumes Bedrock.

Resolution order:

1. explicit inspection target edition/version;
2. Education metadata can establish Education edition;
3. otherwise profile remains unresolved.

`min_engine_version` remains a compatibility constraint and is not treated as the actual running Minecraft version.


## Canonical mutation transaction analyzers

Transaction ordering is implemented by the existing specialized analyzers:

- `mutation-transaction-analysis.ts` for mcfunction command flows;
- `script-mutation-transaction-analysis.ts` for direct Script API block mutations;
- `script-command-transaction-analysis.ts` for commands issued from script.

These are the canonical transaction engines. A separate generic transaction tracer is intentionally not kept.

They model:

```text
APPLY
↓
VERIFY
↓
DEPENDENT ACTION
```

where dependent actions include built-in high-impact actions such as teleport/entity spawn and project-defined contracts such as:

- arena-start function calls;
- scoreboard phase activation;
- tag handoff;
- entity events;
- dialogue handoff;
- selected Script API methods.

### Cross-function and cross-region ordering

The analyzers bounded-inline:

- direct mcfunction calls;
- local script function calls;
- script command execution regions.

They preserve recursion, unresolved calls, and depth limits as proof barriers rather than silently assuming safety.

### Proven ordering defect

When a related verification is statically known but occurs only after the dependent action:

```text
APPLY
↓
DEPENDENT ACTION
↓
VERIFY
```

the evidence explicitly marks verification-before-dependent as absent, producing a knowledge relation violation.

When verification cannot be proven because of unresolved/recursive/depth-limited calls, the analyzer emits:

```text
transaction-order-proof-incomplete
```

which maps to an evidence gap, not a gameplay failure.

## Readiness proof enrichment

Static readiness can now be strengthened by:

- transformed structure placement bounds;
- gated block sentinel checks inside those bounds;
- `schedule on_area_loaded` rectangle/circle/ticking-area coverage;
- exact chunk coverage for direct `fill` and `setblock` mutations.

A standalone `testforblock` is observation evidence only. It is not treated as a readiness gate unless the dependent command is actually gated.

## Route mutation correlation

Project-provided `RouteCorridorContract` volumes can be correlated with:

- fill;
- setblock;
- clone;
- transformed structure placement bounds.

A coordinate overlap is only actionable when dimension identity is compatible or dimension-agnostic by contract.

An overlap emits:

```text
route-affecting-world-mutation
```

and requires route revalidation. It does not assert that AI pathfinding is broken.

## State authority observations

Runtime or QA capture can provide `StateValueObservation` entries for declared authority/mirror contracts.

Reconciliation distinguishes:

- consistent;
- value drift;
- stale mirror revision;
- missing authority;
- missing mirror;
- ambiguous duplicate observations.

This layer requires observed values/revisions; static scoreboard/tag presence alone is not treated as drift proof.

## External and native evidence

`inspectDirectory` accepts optional normalized external evidence.

`inspectArtifact` now feeds native LevelDB scan evidence into that channel before knowledge evaluation.

Persisted chunk records remain disk evidence only. They never imply `loaded-target-chunk`.
