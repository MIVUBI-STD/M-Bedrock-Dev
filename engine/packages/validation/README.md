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
