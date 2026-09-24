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


## Causal chain synthesis

Inspection now produces evidence-aware causal chains in addition to flat diagnostics.

The chain model distinguishes:

```text
observed-state
↓ direct/dependency link
missing requirement
↓
violation or evidence gap
↓ risk-only
downstream risk
```

Three link strengths are used:

- `direct-evidence`: the relevant state contradiction is explicitly observed;
- `dependency-supported`: knowledge establishes a dependency but available evidence is incomplete;
- `risk-only`: project knowledge marks a plausible downstream consequence that has not itself been observed.

Example:

```text
route-affecting-world-mutation
↓
route-revalidation missing/unproven
↓
navigation-stall-risk
↓
fallback-recovery-risk
```

The final two nodes remain risk projections unless separate runtime evidence proves an actual stall or recovery event.

Causal consequence labels come from `KnowledgeRelation.causalConsequences`, not from hard-coded orchestrator relation ids.

Current consequence-enabled high-value relations include:

- route mutation → navigation/recovery risk;
- mutation dependent-work ordering → premature gameplay/partial-world-state risk;
- state authority/mirror drift → incorrect state-decision risk;
- premature terminal reward → reward/progression corruption risk;
- missing structure target → downstream setup failure risk.

### Transaction-order source of truth

Mutation ordering uses the existing canonical analyzers:

- `mutation-transaction-analysis.ts`;
- `script-mutation-transaction-analysis.ts`;
- `script-command-transaction-analysis.ts`.

They perform bounded call expansion, mutation-bound-aware verification, dependent-action contracts, and conservative unresolved barriers.

A redundant generic transaction tracer was intentionally removed rather than maintaining two competing ordering engines.

Proven late verification such as:

```text
APPLY
↓
teleport/spawn/gameplay activation
↓
VERIFY
```

produces explicit absent verification evidence and can become a high-severity relation violation.

Unresolved recursion/call depth/unknown execution paths remain evidence gaps.


## Multi-source causal corroboration

Causal analysis now distinguishes four evidence layers:

```text
risk projection
↓
corroborated risk
↓
observed downstream outcome
↓
scoped causal incident / root-cause candidate
```

### Risk projection

A relation may declare `causalConsequences`.

This only means the consequence is a project-known downstream risk. It is not reported as an observed failure.

### Scoped corroboration

A relation may declare:

```text
causalCorroborators
causalCorroborationMinSources
```

Corroborator predicates must be PRESENT in the same runtime scope. When a minimum provenance count is configured, the predicates must collectively contain that many distinct source references before the risk becomes `corroborated-risk`.

Example for an authored AI route:

```text
route mutation overlaps corridor
+
route explicitly links demo:zombie
+
demo:zombie has navigation
+
demo:zombie has configured target acquisition
+
mutation source and entity source are distinct
↓
navigation-stall-risk = corroborated
```

This still does not mean a stall was observed.

### Observed downstream outcomes

A relation may map a risk to `causalOutcomePredicates`.

For example:

```text
navigation-stall-risk
→ navigation-stall-observed

fallback-recovery-risk
→ teleport-fallback-observed
```

If runtime/QA evidence supplies the observed predicate in the same scope, the causal chain contains an explicit observed-state node.

An observed downstream outcome does not by itself prove that the dependency gap is the sole cause. If the initiating dependency is still unproven, chain confidence remains bounded.

### Route/entity provenance

`RouteCorridorContract` may include `entityKeys`.

Route mutation evidence only uses navigation/targeting evidence from those linked entities. Unrelated entities elsewhere in the project do not corroborate the route chain.

### Causal incidents

Chains sharing a runtime scope are grouped into a `CausalIncident`.

Each incident contains deterministic `RootCauseCandidate` entries with evidence levels:

```text
proven-with-observed-outcome
proven-dependency-violation
corroborated-candidate
unproven-candidate
```

Ordering uses evidence level first, then diagnostic severity, then confidence. It intentionally avoids arbitrary weighted scores.

### Reliability and update comparison

Causal evidence quality contributes compact fingerprint tags such as:

```text
causal-analysis
causal-high-confidence
causal-corroborated-risk
causal-observed-outcome
root-cause-candidate
```

Artifact comparison also reports explicit causal deltas:

- chain/incident count;
- confidence count changes;
- corroborated-risk delta;
- observed-outcome delta;
- root-cause candidate delta;
- added/removed candidate labels.

This allows update analysis to distinguish a map whose static code is unchanged but whose runtime evidence has become stronger or weaker.
