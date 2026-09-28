# Next Action

M-Bedrock-Dev now has a first-class Gameplay Intent Model and an intent-aware diagnostic gate.

## Current lane — Artifact Understanding Before Defect Classification

The immediate architecture priority is no longer broader bug-rule accumulation.

For each representative map family:

1. extract evidence-backed gameplay concepts from source, commands, scoreboards, tags, dialogue, structures, and world state;
2. reconstruct mechanics, phases, lifecycles, ownership, resources, objectives, recovery/reset policy, and spatial semantics;
3. preserve unknown intent explicitly instead of guessing;
4. bind authored invariants to concrete evidence;
5. only then allow Diagnostic Reasoning to classify an observation.

The diagnostic gate now distinguishes:

```text
confirmed-defect
probable-defect
designed-behavior
engine-constraint
compatibility-difference
insufficient-evidence
ambiguous-intent
runtime-proof-required
```

A confirmed defect requires an evidenced contradiction against authored intent. Inferred intent can support only a probable defect. Open intent ambiguity blocks defect classification.

## Calibration corpus

Use the supplied representative worlds as a calibration corpus, beginning with source-explicit maps before compiled/minified maps.

Recommended progression:

```text
explicit source intent
→ modular compiled source
→ bundled/minified source
→ historical differential
→ runtime differential
```

The goal is not map-specific hardcoding. The goal is to prove that one parser-independent intent model can reconstruct meaning across heterogeneous authored worlds.

## Runtime semantics

Continue the runtime-class claim registry work, but consume it as a separate authority:

```text
artifact intent
+
Minecraft runtime semantics
+
observed behavior
→ diagnostic reasoning
```

Do not infer Education/BDS/Preview behavior from Retail by default.

## Safety

- AI/inference may propose intent claims but cannot silently promote them to authored facts;
- unknown intent remains unknown;
- diagnosis strength cannot exceed intent evidence strength;
- static evidence never implies runtime correctness;
- severity is assigned only after defect classification.


## Calibration corpus is now a first-class regression surface

All supplied representative sample worlds should be exercised through the gameplay-understanding corpus runner.

The corpus must remain external-artifact based:

- do not commit proprietary worlds;
- keep only descriptors and normalized fingerprints in the repository;
- compare understanding drift across engine revisions;
- use drift to identify generic blind spots;
- never convert map names or observed node IDs into semantic rules.

Primary next work after each corpus run:

1. inspect maps with new unknown intent;
2. inspect semantic kinds that disappear from a previously understood source style;
3. inspect bundled/minified maps where authored evidence remains weak;
4. expand generic source/command/dialogue/world-state recovery only when multiple corpus cases justify it;
5. keep runtime evidence separate from static authored intent.


## Historical differential is now the next corpus lane

The current-world eight-map corpus has been reviewed at `6bec916ed904fd06f064a799731de4021432e12d`.

Next generic learning priority:

1. compare current vs Old Version / Raw Dev where artifacts actually exist;
2. identify stable contracts, deliberate changes, migration leftovers, and legacy paths;
3. preserve reachability uncertainty—history alone cannot prove dead code or a defect;
4. keep runtime-differential proof separate from static historical inference.


## Current corpus blocker status

Reviewed baseline `2aaf14bf81856c995cdcaed9b8af330ec7c4065c` has:

```text
maps with unknown intent  0 / 8
total unknown intent      0
```

Next priority is no longer unknown-intent elimination. It is evidence-strength improvement for bundled/minified maps and broader historical/runtime differential proof.


## Next runtime-evidence hardening lane

Arm-scoped controlled-experiment evidence is now preserved and consumable by diagnostic reclassification.

Next generic priorities:

1. bind arm semantics to explicit control/treatment roles rather than relying only on arm IDs;
2. model expected contrast direction so a diagnostic binding states which arm/state combination constitutes contradiction or design match;
3. require intervention contrast explicitly for claims that depend on causal discrimination rather than simple runtime observation;
4. carry arm-scoped evidence through causal proof and repair-decision provenance without flattening it;
5. add runtime differential fixtures for scheduler, chunk lifecycle, entity AI/pathfinding, multiplayer, and persistence classes.

Do not infer causal meaning merely because two arms differ. The experiment definition, arm roles, expected direction, target profile, evidence integrity, and diagnostic intent binding must agree before promoting the claim.


## Next lane — preserve experiment semantics into causal proof

Role-aware expected contrast is now available at diagnostic reclassification.

Next priorities:

1. carry experiment id, predicate, role, expected state, observed state, and expected-direction disposition into causal proof provenance;
2. prevent a generic `intervention-supported` proof from authorizing repair when its supporting experiment contrast belongs to a different predicate or direction;
3. bind causal candidates to the exact controlled factor/intervention that discriminated them;
4. retain control evidence, treatment evidence, runtime profile, fixture fingerprint, and experiment revision through repair admission and proof bundles;
5. require preservation/retest plans to reference the same causal experiment contract when a repair is justified by controlled runtime evidence.

A controlled difference is evidence only for the predicate and intervention contract that produced it. Do not promote experiment-level status into unrelated causal claims.
