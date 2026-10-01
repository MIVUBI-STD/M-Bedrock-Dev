# Validation

Reusable contracts for post-mutation validation.

Validation is distinct from mutation:

```text
apply working-copy transaction
→ execute declared validation steps
→ accepted / rejected
```

Current step contracts are typed:

- reparse an exact source;
- rebuild semantic graph;
- rerun an exact diagnostic code, optionally scoped to source;
- verify a topology outlier is absent at an exact source location.

The validation package owns result/step contracts and generic aggregation. Domain execution remains in the orchestrator because it composes analyzers and graph owners.


## Proof sufficiency

A passing validation run is not automatically sufficient evidence.

Each scenario declares `requiredProofLevel`. Trace assessment compares the run proof level with that requirement and exposes `proofSufficient`.

Invariant coverage counts only runs that are:

- current for the scenario/artifact/runtime context;
- passing;
- at or above the scenario's required proof level.

For example, a scenario requiring `LIVE GAME VERIFIED` is not closed by a `STATIC VERIFIED` run even when every static validation step passes.
