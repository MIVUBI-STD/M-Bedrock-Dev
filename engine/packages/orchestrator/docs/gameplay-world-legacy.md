# Legacy Gameplay World Composite

`gameplay-world-model.ts` is retained as a compatibility projection because existing callers consume its flattened mixed surface.

Canonical new code should use:

```text
gameplay-semantic-model.ts
→ gameplay meaning / structure / mechanics

map-engineering-assessment.ts
→ QA, proof, capacity, isolation, contract coverage, runtime gaps
```

Do not add new engineering/QA fields to the semantic model. Do not add new gameplay meaning fields to the engineering assessment.
