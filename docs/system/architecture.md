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

- **Game:** existing `game` subject IDs, or an empty list when none were grounded. The same projection includes a compact `subjects` and `scenarios` lookup so every relationship endpoint/scenario ID remains navigable in the standalone report without reconstructing another graph.
- **Systems:** existing runtime-domain components. `provenFeatureIds` require an exact PROVEN causal link; `coPlacedFeatureIds` are only navigational scenario co-placement.
- **Features:** existing mechanic, objective, phase, lifecycle and outcome subjects. Each exposes source evidence, scenario membership, typed dependency/effect/transition/outcome links with their original status, and IR traces matched by exact evidence.
- **Unmodeled:** unplaced features and unmatched technical Semantic IR evidence remain visible. Empty association is not positive proof of feature absence.
- **Authority:** this is a rebuildable view. It does not infer missing player design, promote unresolved relationships to PROVEN, change the mandatory audit gates or claim runtime truth.

During BUILD, complete missing authored semantics at existing source/intent/behavior owners before inventing deeper feature taxonomies, test fixtures, or alternate graph stores. Integration acceptance remains deferred until the full path is ready.

### Classified function and guarded-return provenance

The existing `Gameplay Intent` producer now retains parser-observed named function regions on already classified subjects and links them to unique Semantic IR region identities using artifact, source module, region and owner. This supplies navigable execution traces without claiming that functions actually ran or that lexical labels prove game design.

The source-grounded guarded return path reconciles `ScriptGuardedOutcome.outcomeSource` with a unique `ScriptReturnOutcome.source` at the exact authored range, execution region, property and value. The existing Intent outcome/state nodes and guarded `requires` relationships inherit that precise return witness. Ambiguous or missing sites remain unresolved; no mechanic or second graph is invented.

### mcfunction-to-gameplay evidence continuity

The canonical `inspect.ts` passes its existing indexed `.mcfunction` sources into `buildGameplayIntentModel()` alongside the same Semantic IR. A classified function is linked only when its source identity matches a unique `mcfunction` execution region and the corresponding surface candidate already exists. Direct `function` invocations require an exact parsed command location and a uniquely resolved IR target. Scoreboard and tag operations use the existing normalized state-surface IDs and are represented as technical `resource` facts, not assumed scoring rules or player effects.

All new function-to-function and function-to-resource Intent relations remain `inferred`. Missing, ambiguous, or unclassified content remains evidence debt in the existing IR/Discovery Challenger. No second parser, scenario compiler, graph, or report authority is introduced.

### Effect-directed source reconstruction

`behavior-model/source-evidence.ts` now derives bounded, backward `SourceEffectSlice` records from existing Semantic IR state mutations, resource actions and authored returns. This follows CodeQL/Joern-style **principles** without installing an engine, adding a graph database or claiming CodeQL-level def-use precision.

For each authored effect/return the owner traverses *only uniquely identified resolved IR execution edges* backward toward event sources, script modules or uncalled mcfunctions; it retains a representative entry-to-effect edge chain, lexical/precedence guards, deferred/periodic boundaries, same-surface preceding read candidates and existing same-region source-ordered return associations. Hard per-effect limits cap depth, visited regions and entry candidates; truncation is surfaced as `TRUNCATED`. Missing ingress stays `NO_KNOWN_INGRESS`, **not** unreachable code or evidence of gameplay absence.

The existing `deriveGameplayArchitectureNavigation()` consumes these behavior-model slices once, connects effects to graph components only by exact evidence ID and separately labels feature associations encountered on a source-call path. It publishes them through the already-established `MapAuditOutputV2.gameplayStructure` view. Static path association is not player-facing gameplay meaning or PROVEN causality; unowned effect IDs remain explicit. Testing/CI are deferred until the integrated BUILD acceptance boundary.

### Minecraft authored world-effect sinks

The existing Semantic IR execution owner now normalizes **source-observed attempts** from canonical command, script method, spatial mutation and entity-event parsers into optional `worldEffects` records (spawn, teleport, block change, structure load, dialogue and entity event). Records carry exact source and execution-region IDs, kind, mechanism and evidence precision—not runtime success or game-design meaning. No second detector/parser is introduced.

Canonical forward source traces and behavior-model backward effect slices include these IDs. Gameplay Intent only links effect evidence when the same execution-region ID is owned by exactly one recognized, non-hypothetical source candidate. Unowned and ambiguous effects remain visible in the existing Game-Centric navigation and Map Audit V2 source-effect contract. Report publication and proof gates are unchanged.

### Per-mechanic source behavior paths

Source slicing now preserves alternative caller paths rather than using one global visited-region set that can suppress a second ingress. The traversal remains bounded by path states, depth and collected entry candidates; cycles and excess paths explicitly mark `TRUNCATED`. Every admitted path carries the exact call-site lexical/precedence guards, while resource action slices distinguish authored acquire from release (without claiming cleanup succeeded).

The existing game-centric `features[].sourceBehaviorPaths` is a **derived view over the existing effect slices**. Each effect candidate presents source entry, call edges, guard evidence, preceding same-surface reads, authored resource acquire/release, and guarded source-ordered return IDs where available. `DIRECT_EFFECT_EVIDENCE` is reserved for exact effect IDs on the recognized feature; `CALL_PATH_CONTEXT` identifies a feature encountered on a possible call path and is not proof of gameplay ownership. This projection does not merge incompatible branch outcomes or invent a terminal/recovery flow when source evidence is absent. Neither status constitutes real Minecraft execution.

### World effects and authored returns

The existing Behavior Model source-evidence owner now reconciles normalized Minecraft world-effect attempts and literal return sites only in the exact same execution region and source document, with complete and ordered source positions. An unguarded return permits only a `SOURCE_ORDER_CANDIDATE` claim, not effect success, gameplay causality or terminal proof. Guarded returns remain `UNRESOLVED` when world-effect records lack compatible exact branch ancestry.

The canonical backward `SourceEffectSlice.sourceOrderedOutcomeIds`, Scenario `observedSourceRelationships` and Discovery Challenger all consume this same reconciliation. There is no new parser, graph, report field or proof gate. Ambiguous source relationships remain explicit rather than being upgraded to PROVEN.

### Authored guard provenance for Minecraft world effects

The existing Script AST parser preserves lexical and preceding-exit guards for selected typed API calls, explicit `runCommand` sites, spatial mutations and entity-event triggers through exact call-source identity. The existing spatial world-mutation analyzer's output is now returned by `parseScriptFile` and reaches Semantic IR. Plain embedded command strings remain source content, not executed command evidence.

Semantic IR world effects retain the exact authored branch ancestry. Existing source execution traces place world effects on matching branch arms; backward effect slices expose their guards. The Behavior Model correlates each world-effect/return pair only when its source order, lexical branch arms and early-exit conditions are compatible. `precedingWorldEffectIds` preserves nearby evidence while `guardCompatibleWorldEffectIds` gives the bounded source-order subset. Scenario relationships classify each ID independently instead of borrowing proof from another effect. Even a compatible source path does not prove execution, causality, or gameplay design.

### Source-local guard state provenance

The existing Script AST parser preserves exact lexical and preceding-exit guards on `getDynamicProperty` and `setDynamicProperty` calls; `semantic-ir-stage` carries them into the **existing** state operation records. No second symbol model or control-flow graph is created.

The canonical `deriveSourceEffectSlices()` now resolves exact state-read call spans *inside* an authored effect guard expression (`guardStateReadIds`) rather than assuming all nearby reads are preconditions. Where a literal dynamic-property surface, stable source receiver expression, exact function/document, source order and compatible guard ancestry all match, the view also records **candidate** earlier state writes (`candidateGuardStateWriteIds`). A reused expression is not guaranteed to be the same runtime object, so these remain source-level possible definitions—not reaching-def proof or game-causal truth. Wildcard keys, other regions, and inconsistent guards do not qualify. The existing Gameplay Architecture feature paths and optional Map Audit V2 schema consume this source evidence; unknowns and publication gates remain unchanged.

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