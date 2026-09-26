# Current Validation

Status: REMOTE STATIC SOURCE GREEN THROUGH DIAGNOSTIC REASONING; PROVENANCE + CONCURRENCY UPDATE PENDING CURRENT CI; RUNTIME PROOF DEFERRED

## Established static layers

The repository now contains:

- Semantic IR;
- Behavioral World Model;
- scoped Minecraft session/entity/chunk/scheduler overlays;
- conservative temporal evaluation;
- Diagnostic Reasoning with competing hypotheses;
- Runtime Lab control plane and read-only host adapter.

## Provenance model

Behavior claims now distinguish how they are justified.

Current Minecraft overlay claims are intentionally marked:

```text
kind             project-policy
evidence ceiling designed
```

This prevents those abstractions from being interpreted as documented, observed, or causal Minecraft behavior.

Unbound claims are visible through provenance audit results.

## Concurrency model

The interleaving engine can now incorporate:

```text
explicit happens-before
hidden engine dependency surfaces
declared read/write resources
```

This fixes the unsafe assumption that two operations are independent merely because explicit resources do not overlap.

The model also rejects happens-before cycles.

## Still unproven

- actual Bedrock scheduler ordering;
- actual Education ordering differences;
- replayability of Minecraft nondeterminism;
- real chunk residency transitions;
- AI/pathfinding semantics;
- completeness of hypothesis alternatives;
- adversarially verified invariants;
- semantic before/after repair equivalence;
- real multi-client execution.
