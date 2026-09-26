# Next Action

M-Bedrock-Dev now has behavior provenance, happens-before concurrency semantics, adversarial invariant promotion gates, and semantic before/after trace comparison.

## Current lane — Preservation Intelligence Before Runtime Testing

Do not expand local/live Minecraft testing yet.

### Completed reliability hardening

- behavior claims carry provenance and evidence ceilings;
- Minecraft overlays remain `project-policy / designed`;
- interleaving exploration can use happens-before plus hidden engine surfaces;
- cyclic happens-before graphs are rejected;
- invariant promotion requires a passed adversarial falsification receipt;
- passive support alone cannot authorize promotion.

### Completed semantic differential preservation

Before/after behavior is compared by semantic checkpoint and occurrence, not raw tick index.

A trace policy can declare:

- required checkpoints;
- must-preserve state keys;
- must-change state keys;
- allowed-change state keys;
- timing tolerance.

The comparator reports:

- intended deltas;
- unexpected deltas;
- must-preserve drift;
- missing checkpoints;
- timing drift;
- unchanged must-change keys.

Incomplete traces or missing required checkpoint instances remain `unknown`; they cannot prove equivalence.

## Next architecture order

1. bind semantic checkpoints to Behavioral World Model transitions and temporal properties;
2. connect property violations to Diagnostic Reasoning hypotheses;
3. add edition/host semantic overlays for Bedrock retail, BDS, and Education;
4. strengthen partial-order reduction using full causal closure and generation semantics;
5. add calibration corpus design for future probabilistic belief;
6. only then connect physical Minecraft runtime channels.

## Safety

- specification is not engine truth;
- passing passive observations is not enough for invariant promotion;
- read/write disjointness is not enough for independence;
- missing semantic trace coverage cannot prove preservation;
- intended repair success does not excuse unrelated state or timing drift.
