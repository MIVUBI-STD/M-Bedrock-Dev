# Current Validation

Status: REMOTE STATIC SOURCE GREEN THROUGH ADVERSARIAL INVARIANT GATE; SEMANTIC TRACE DIFF PENDING CURRENT CI; RUNTIME PROOF DEFERRED

## Static reasoning stack

The repository now contains:

- Semantic IR;
- Behavioral World Model;
- scoped Minecraft overlays;
- behavior provenance/evidence ceilings;
- Diagnostic Reasoning;
- happens-before-aware reliability search;
- adversarial invariant falsification receipts;
- Runtime Lab control plane;
- semantic trace differential preservation.

## Invariant promotion

A mined candidate cannot be promoted merely because it is `supported`.

Required path:

```text
support
→ challenge
→ relevant mutation exercise
→ no surviving relevant mutation
→ no historical contradiction
→ passed falsification receipt
→ promotion draft
```

## Semantic trace preservation

The preservation layer can compare complete before/after traces at semantic checkpoints.

It distinguishes:

```text
must-preserve
must-change
allowed-change
unexpected
```

and separately checks checkpoint timing drift.

A missing checkpoint or incomplete trace results in `unknown`, not pass.

## Still unproven

- actual Bedrock scheduler ordering;
- Education-specific ordering differences;
- runtime replayability;
- AI/pathfinding semantics;
- real chunk lifecycle;
- completeness of diagnostic hypotheses;
- semantic checkpoint extraction from arbitrary maps;
- real multi-client execution.
