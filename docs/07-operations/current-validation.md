# Current Validation

Status: GAMEPLAY INTENT + INTENT-AWARE DIAGNOSTICS IMPLEMENTED; 8-MAP UNDERSTANDING CORPUS BASELINED; RUNTIME PROOF EXPANDING

## Current static reasoning stack

- Semantic IR;
- Gameplay Intent Model;
- evidence-grounded intent graph and authored invariants;
- explicit unresolved intent/ambiguity representation;
- Behavioral World Model;
- scoped Minecraft runtime overlays;
- claim provenance/evidence ceilings;
- Diagnostic Reasoning;
- intent-aware diagnostic classification gate;
- property-to-symptom evidence binding;
- happens-before-aware reliability search;
- adversarial invariant falsification;
- semantic trace differential preservation;
- Runtime Lab control plane.

## Diagnostic safety added

The diagnostic layer can now distinguish designed behavior, engine constraints, compatibility differences, insufficient evidence, ambiguous intent, runtime-proof-required observations, probable defects, and confirmed defects.

Confirmed defect classification requires:

```text
grounded intent subject
+
authored invariant
+
observation evidence
+
contradiction evidence
+
runtime proof when the claim requires runtime semantics
```

Inferred intent is capped at probable defect.

## Still unproven

- complete semantic correctness across the supplied corpus; extraction now runs across all eight sample families, but false-semantic review remains necessary;
- coverage quality on bundled/minified map scripts;
- cross-version historical intent reconstruction;
- actual semantic differences for most runtime classes;
- complete official knowledge coverage;
- observed-vs-documented conflict resolution;
- runtime scheduler/fairness behavior;
- replayability;
- AI/pathfinding behavior;
- real chunk lifecycle;
- real multi-client execution.


## Calibration corpus proof

The current external corpus contains eight representative worlds spanning explicit source, modular compiled source, and bundled/minified source.

Baseline revision `bf30dcbbd06247878156da2b79bcf13c5102ce51` produced:

```text
cases                 8
intent nodes          1105
authored nodes        183
inferred nodes        922
unknown intent        2
maps with unknowns    1
route profile cases   1
authored route points 67
```

This proves the same inspection/intent pipeline can recover non-empty gameplay semantics across all eight sample families.

It does not prove that every recovered semantic classification is correct. Corpus drift and false-semantic review remain required.
