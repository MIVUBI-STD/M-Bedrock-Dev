# Next Action

M-Bedrock-Dev now has a Behavioral World Model kernel in addition to the existing evidence, preservation, search, and Runtime Lab foundations.

## Current lane — Behavioral Semantics Before Runtime Testing

Do not expand local/live Minecraft testing yet.

The next goal is to make the reasoning model strong enough to interpret runtime evidence without confusing absence of counterexamples with proof.

### Completed kernel

- typed semantic state variables;
- explicit state authority;
- deterministic precondition/effect transitions;
- Minecraft nondeterminism-surface taxonomy;
- finite behavior traces;
- conservative three-valued temporal evaluation;
- ALWAYS;
- EVENTUALLY;
- bounded EVENTUALLY;
- LEADS-TO;
- bounded LEADS-TO;
- UNTIL;
- bounded UNTIL.

### Current proof ceiling

Repository CI can prove only the deterministic model contracts and finite-trace evaluator.

The kernel is not yet a complete Bedrock/Education model and must not be described as one.

No runtime coverage state should be upgraded from this work.

## Next architecture order

1. build Minecraft domain overlays for:
   - player/session lifecycle;
   - arena ownership/generation;
   - entity lifecycle/navigation ownership;
   - chunk residency/readiness;
   - scheduler/deferred callbacks;
2. add host/edition-specific nondeterminism capabilities:
   - observable;
   - controllable;
   - replayable;
   - simulatable;
   - unknown;
3. build a Hypothesis Graph:
   - competing explanations;
   - required evidence;
   - falsifiers;
   - expected intervention outcomes;
4. add experiment selection by discriminative power/information gain;
5. strengthen concurrency exploration with happens-before semantics rather than declared read/write overlap alone;
6. make invariant promotion require adversarial falsification, not passive support alone;
7. introduce semantic trace comparison for before/after repair;
8. only then connect physical Minecraft runtime channels.

## Safety

- source structure is not behavioral truth;
- a behavioral specification is not engine proof;
- an incomplete trace is not a liveness proof;
- absence of a counterexample is not an invariant proof;
- declared nondeterminism is not automatically controllable;
- Bedrock and Education semantics require independent overlays where behavior differs.
