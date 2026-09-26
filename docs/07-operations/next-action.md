# Next Action

M-Bedrock-Dev now has formal behavior provenance and an initial happens-before concurrency model in addition to the Behavioral World Model and Diagnostic Reasoning layers.

## Current lane — Adversarial Verification Before Runtime Testing

Do not expand local/live Minecraft testing yet.

### Completed provenance work

- behavior variables/transitions/properties can carry claim provenance;
- explicit evidence ceilings;
- provenance-gap audit;
- Minecraft domain overlays are marked `project-policy / designed`;
- designed specifications cannot masquerade as observed engine truth.

### Completed concurrency work

- explicit happens-before edges;
- transitive happens-before queries;
- cycle rejection;
- causal/program/generation/event ordering reasons;
- hidden engine dependency surfaces;
- interleaving reduction consults semantic dependency as well as read/write footprints;
- session operations now expose engine-sensitive semantic surfaces.

### Current proof ceiling

These are deterministic architecture contracts only.

They do not prove actual Bedrock/Education event ordering, chunk behavior, or scheduler behavior.

## Next architecture order

1. enforce adversarial falsification before invariant promotion;
2. add semantic trace comparison for before/after repair;
3. connect behavioral property violations to diagnostic hypotheses;
4. create edition/host semantic overlays for Bedrock retail, BDS, and Education without assuming parity;
5. add stronger partial-order reduction using causal/happens-before closure rather than the current bounded reduction heuristic;
6. add calibrated probabilistic belief only after a real calibration corpus exists;
7. only then connect physical Minecraft runtime channels.

## Safety

- provenance ceiling limits what a claim may authorize;
- read/write disjointness does not imply Minecraft independence;
- shared hidden engine surfaces prevent unsafe schedule collapsing;
- a cyclic happens-before model is invalid;
- designed semantics remain specifications until supported by stronger evidence.
