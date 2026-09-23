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
