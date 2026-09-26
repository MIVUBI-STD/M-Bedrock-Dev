# Current Validation

Status: REMOTE STATIC SOURCE GREEN; FORMAL BEHAVIOR + DIAGNOSTIC REASONING STATIC ONLY; RUNTIME PROOF PENDING

## Behavioral World Model — 2026-09-27

Static contracts now cover:

- typed semantic variables and authority labels;
- scoped state identities for multiple players/entities/arenas;
- composable boolean predicates;
- explicit transition preconditions/effects;
- declared Minecraft nondeterminism surfaces;
- unknown-by-default runtime control/replay capability profiles;
- initial Minecraft session/entity/chunk/scheduler overlays;
- ALWAYS / EVENTUALLY / LEADS-TO / UNTIL;
- bounded tick deadlines;
- three-valued `satisfied / violated / unknown` results.

The proof rule remains fail-closed:

```text
clean incomplete prefix != proven property
```

## Diagnostic Reasoning — 2026-09-27

A new semantic owner exists at:

```text
packages/diagnostic-reasoning/
```

It can represent several plausible explanations for one symptom and distinguish:

```text
open
supported under declared evidence contract
eliminated by explicit contradiction/falsifier
```

Probe planning compares expected outcomes across currently viable hypotheses and scores how many hypothesis pairs a probe can separate, with cost/risk penalties.

This is deliberately not a probability/confidence engine.

The current planner does not claim:

- calibrated priors;
- posterior probability;
- completeness of alternative explanations;
- causal identification;
- real information gain in the Shannon/Bayesian sense.

## Existing Runtime Lab

The source-verified Runtime Lab host remains available but local/live Minecraft execution is intentionally deferred.

No new Minecraft runtime claim is created by the behavior or diagnostic-reasoning work.

## Still unproven

- complete Bedrock behavioral semantics;
- complete Education behavioral semantics;
- engine scheduler/fairness behavior;
- deterministic runtime replay;
- formal happens-before model for engine events;
- AI/pathfinding transition semantics;
- real chunk lifecycle behavior;
- completeness of generated competing hypotheses;
- calibrated causal belief;
- real multi-client execution;
- semantic before/after repair equivalence.
