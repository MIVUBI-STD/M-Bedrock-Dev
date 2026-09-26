# Next Action

M-Bedrock-Dev now has a formal Behavioral World Model kernel, scoped Minecraft model overlays, and an explicit competing-hypothesis reasoning layer.

## Current lane — Diagnostic Reasoning Before Runtime Testing

Do not expand local/live Minecraft testing yet.

The next goal is to make diagnosis choose evidence because it separates plausible causes, not because a probe happens to exist.

### Completed behavioral foundation

- typed/scoped semantic state variables;
- multiple player/entity/arena instances without state aliasing;
- composable predicates including implication;
- deterministic precondition/effect transitions;
- Minecraft nondeterminism-surface taxonomy;
- capability profiles that default unproven observability/control/replay/simulation to unknown;
- player/session overlay;
- entity lifecycle/navigation overlay;
- chunk residency overlay;
- deferred-callback generation safety overlay;
- ALWAYS / EVENTUALLY / LEADS-TO / UNTIL with conservative finite-trace semantics.

### Completed diagnostic-reasoning foundation

- explicit competing hypotheses;
- required evidence predicates;
- supporting predicates;
- falsifiers;
- expected intervention outcomes;
- open / supported / eliminated assessment;
- probe outcome predictions per hypothesis;
- discriminative-power scoring;
- explicit probe cost/risk penalty;
- no fabricated Bayesian confidence.

### Current proof ceiling

Repository CI proves deterministic contracts only.

A behavioral model is still a specification, not Minecraft engine truth.
A supported hypothesis is not a causal conclusion.
Probe utility is not confidence.

No runtime coverage state should be upgraded from this work.

## Next architecture order

1. add provenance to every behavioral transition/property binding:
   - source inference;
   - official knowledge;
   - project policy;
   - runtime evidence;
2. build evidence-to-hypothesis adapters without losing unknown/contradictory states;
3. strengthen concurrency exploration:
   - happens-before edges;
   - dependency from semantic state/engine surfaces;
   - no read/write-only independence assumption;
4. require adversarial falsification before invariant promotion;
5. add semantic before/after trace comparison for preservation;
6. add calibrated belief only after a training/calibration corpus exists;
7. only then connect physical Minecraft runtime channels.

## Safety

- source structure is not behavioral truth;
- a behavioral specification is not engine proof;
- an incomplete trace is not a liveness proof;
- absence of a counterexample is not an invariant proof;
- an unlisted alternative explanation remains a blind spot;
- a high probe utility does not mean the predicted hypothesis is true;
- Bedrock and Education semantics require independent overlays where behavior differs.
