---
id: document.system.architecture
class: DOCUMENT
domain: system
role: ARCHITECTURE
authority: CANONICAL
lifecycle: ACTIVE
---

# Architecture

Lazy-Developer uses semantic ownership and one-way dependency direction.

## Semantic reasoning path

```text
artifact + archive
        ↓
project-model
        ↓
current map Game Design
        ↓
scoped Gameplay Contract / design readiness
        ↓
analyzers
        ↓
semantic graph + Semantic IR
        ↓
Gameplay Intent Model
        ↓
Behavioral World Model
        ↓
Diagnostic Reasoning
        ↓
Reliability Search / Runtime Lab
        ↓
causal reasoning
        ↓
repair + preservation verification
        ↓
orchestrator
```

## Game-centric Discovery production spine

The production route is an integrated **source-to-understanding** contract, not a sequence of independent gates that each demand new tests:

```text
selected Minecraft artifact
→ physical/source inventory (adapters + analyzers/discovery)
→ parsed authored behavior and exact provenance (domain analyzers)
→ normalized execution/state/temporal evidence (semantic-ir)
→ authored gameplay purpose/mechanics (gameplay-intent)
→ transitions, dependencies, outcomes (behavior-model + graph)
→ scenario composition / gameplay-world understanding (existing orchestrator)
→ navigable Game → Systems → Mechanics → Flows/States → Scenarios
→ evidence-backed audit/report projection
```

Ownership constraints:
- Physical file accounting is not game-understanding completeness. `OPEN` structural gaps and `PARTIAL` recorded uncertainty must never be silently rewritten as confirmed semantics.
- `semantic-ir` describes source execution/state; `gameplay-intent` assigns player-facing purpose. Neither alone proves the complete game or runtime behavior.
- Scenario presets guide inspection; they must not invent undiscovered mechanics or replace source-grounded relationships. The scenario graph and architecture navigation are derived views, not competing canonical model stores.
- Discovery Challenger compares raw material source facts against modeled, evidence-backed behaviors, and retains unowned facts as visible gaps. It does not require endless per-edge patching to publish independent, scoped evidence.
- Existing report/admission owners control final publication. An incomplete model may expose scoped evidence, but never claim whole-map closure.
- During construction, prioritize wiring and consolidating this full spine before adding detectors, another graph layer, micro-fixtures or test harnesses. End-to-end acceptance is a later integration boundary; runtime claims still require runtime evidence.

### Game-centric operator projection

The canonical `deriveGameplayArchitectureNavigation()` projection exposes `gameplayStructure` from the existing scenario graph and exact selected-artifact evidence. The production `runSelectedMapAudit()` composes this once, retaining it on `SelectedMapAuditRun.gameplayArchitecture` and passing the same derived structure to the optional, backward-compatible `MapAuditOutputV2.gameplayStructure` field.

- **Game:** existing `game` subject IDs, or an empty list when none were grounded.
- **Systems:** existing runtime-domain components. `provenFeatureIds` require an exact PROVEN causal link; `coPlacedFeatureIds` are only navigational scenario co-placement.
- **Features:** existing mechanic, objective, phase, lifecycle and outcome subjects. Each exposes source evidence, scenario membership, typed dependency/effect/transition/outcome links with their original status, and IR traces matched by exact evidence.
- **Unmodeled:** unplaced features and unmatched technical Semantic IR evidence remain visible. Empty association is not positive proof of feature absence.
- **Authority:** this is a rebuildable view. It does not infer missing player design, promote unresolved relationships to PROVEN, change the mandatory audit gates or claim runtime truth.

During BUILD, complete missing authored semantics at existing source/intent/behavior owners before inventing deeper feature taxonomies, test fixtures, or alternate graph stores. Integration acceptance remains deferred until the full path is ready.

## Behavioral claim provenance

Behavior variables, transitions, and temporal properties may carry provenance with an explicit evidence ceiling:

```text
designed
inferred
documented
observed
intervention-supported
```

Designed Minecraft overlays are bound to explicit Map Game Design or authored Behavior Contracts. They are specifications to test, not claims that the engine has already been proven to behave that way.

A provenance audit reports unbound claims rather than silently accepting them.

## Concurrency semantics

Reliability search must not infer independence solely from declared reads/writes.

The concurrency layer can additionally consume:

- explicit happens-before edges;
- causal parent ordering;
- generation ordering;
- event-delivery ordering;
- hidden engine dependency surfaces.

Operations sharing a configured hidden engine surface are treated as dependent even when their explicit resources differ.

Examples include:

```text
event-ordering
deferred-callback-order
chunk-residency
network-input-order
```

Happens-before graphs must be acyclic. A cycle is a model error, not an empty valid schedule space.

## Separation of authorities

Game Design owns explicit intended gameplay for the current map/mode.

Gameplay Contract is a scoped derived working projection used by audit/repair. It is never a second persisted Game Design authority.

The semantic graph owns references/dependencies.

Semantic IR owns normalized source execution/state/scheduling structure.

Gameplay Intent owns evidence-backed reconstruction of authored mechanics, actors, objectives, phases, lifecycles, resources, spatial semantics, policies, outcomes, and explicit unknowns. It does not declare root cause.

The Behavioral World Model owns explicit semantic state, transitions, nondeterminism declarations, and temporal properties.

Diagnostic Reasoning owns competing explanations and evidence discrimination.

Reliability Search owns bounded state/schedule exploration.

Runtime Lab owns controlled empirical experiments.

No layer may silently promote its own representation into another proof authority.

## Orchestration boundary

The orchestrator composes semantic owners; it must not duplicate parser, graph, diagnostics, archive, compatibility, or domain-analysis semantics.

Canonical direction:

```text
artifact / source representation
→ adapters + analyzers
→ semantic/project models
→ gameplay understanding / diagnosis
→ repair / validation owners
→ orchestrator composition
→ app / report projection
```

Low-level owners remain authoritative for their domain semantics. Orchestration owns sequencing, composition, continuation, and cross-owner coordination only.

## Integrated analysis rule

Cross-domain analysis is built by composing evidence from existing owners rather than creating another all-purpose analyzer.

Examples include:
- manifest + script dependency compatibility;
- selector/state scope + arena ownership;
- structure/world evidence + gameplay topology;
- entity/navigation + chunk/simulation readiness;
- inventory/economy + lifecycle ownership.

A cross-domain rule may correlate evidence, but it does not take ownership away from the contributing analyzers.

## Conservative inference

Topology, runtime behavior, cross-domain state, and platform capability must remain evidence-bounded. Repeated patterns, parser success, or nearby healthy code do not by themselves prove gameplay correctness.

## Normalized project model

The normalized project model is the boundary between physical files and semantic analysis:

```text
artifact graph
→ file inventory
→ normalized components
→ semantic dependency graph
```

These layers are separate authorities.

Extracted files remain source truth. Normalized components and semantic graphs are derived/rebuildable truth and must remain traceable through source references.

Component identity should be stable across workspace relocation and based on semantic scope + identifier rather than absolute paths.

The project-model package may organize internal contracts, evidence, runtime normalization, and session continuity into subgroups, but those groups do not become separate semantic authorities.
## Knowledge access architecture

Repository information is accessed through one composable path:

```text
Task / Question
→ Router
→ Catalog
→ Graph
→ Retrieval
→ Context
→ Reasoning / Audit / Development
```

Each stage has one responsibility:

- Router — selects the initial domain/canonical owner.
- Catalog — resolves stable resource identity and metadata.
- Graph — expands only typed relationships relevant to the concern.
- Retrieval — ranks the bounded candidate set.
- Context — compiles the minimum evidence package.

This path supplements source ownership; it does not replace it.

### Management flow

New or changed information follows:

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

A change is production-complete only when the affected resource remains reachable through its Router/consumer and its relationships remain valid.

### Retrieval order

Use structural evidence before semantic similarity:

```text
Router scope
→ canonical owner
→ Catalog identity
→ Graph neighbors
→ source/ownership structure
→ lexical ranking
→ optional semantic ranking
→ authority filtering
→ Context
```

Lexical ranking is repository-native and requires no external provider. Semantic ranking is optional enrichment after routing, graph, and structural/lexical narrowing.

Pure vector similarity must not search the entire repository as an unbounded first step.

### Document section indexing

H2/H3 headings in canonical documents are exposed as DERIVED Catalog resources. They retain the parent path and use a heading locator.

```text
DOCUMENT parent
→ derived H2/H3 section
→ Retrieval candidate
```

This enables bounded loading of large owners without fragmenting them into many files.

### Generated projections

Generated indexes and graphs are DERIVED.

They must be:

- deterministic when inputs are unchanged;
- rebuildable from canonical sources;
- safe to delete and regenerate;
- excluded from manual semantic editing;
- validated against current source identities.

### No management-layer proliferation

Do not introduce parallel responsibilities named Knowledge Manager, RAG Manager, Memory Manager, Context Manager, Docs Manager, or Graph Manager when the responsibility already belongs to Catalog, Graph, Retrieval, Context, or an existing canonical package.

Prefer extending existing graph, analysis-planner, knowledge, project-model, and orchestrator owners rather than creating a parallel subsystem.