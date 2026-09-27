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
