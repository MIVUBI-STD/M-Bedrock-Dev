# Architecture

M-Bedrock-Dev uses semantic ownership and one-way dependency direction.

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
