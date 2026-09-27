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

Reviewed baseline revision `2aaf14bf81856c995cdcaed9b8af330ec7c4065c` produced:

```text
cases                 8
intent nodes          1145
authored nodes        181
inferred nodes        964
unknown intent        0
maps with unknowns    0
route profile cases   1
authored route points 67
```

This proves the same inspection/intent pipeline can recover non-empty gameplay semantics across all eight sample families.

It does not prove that every recovered semantic classification is correct. Corpus drift and false-semantic review remain required.


## Reviewed semantic corrections

- Bedwars role/team and bed-objective concepts are recovered generically from bundled semantics.
- Resource generators are classified as mechanics rather than raw resources.
- Orb countdown/finish helper actions are no longer counted as gameplay phases; phase/stage state remains represented as state evidence.
- Two false authored structural outcomes were removed from The Circuit; authored nodes are now 181, unknown intent is 0, and Five Nights route proof remains 67 authored route points.


## Historical comparison proof

Marathon Test of Tactics v1.0.2 → v2.2.0 was compared under one engine revision:

```text
artifact fingerprint changed      yes
gameplay intent disposition       stable
added intent nodes                0
removed intent nodes              0
node status changes               0
invariant changes                 0
artifactChangedIntentStable       true
```

This proves packaging/implementation change can be distinguished from authored gameplay-intent change.
