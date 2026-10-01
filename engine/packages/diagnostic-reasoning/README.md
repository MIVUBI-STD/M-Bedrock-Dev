# Diagnostic Reasoning

This package owns explicit competing-explanation reasoning.

It sits between behavioral/knowledge evidence and Runtime Lab planning.

## v1

A hypothesis declares:

- required predicates;
- supporting predicates;
- falsifiers;
- expected intervention outcomes.

Evidence can keep a hypothesis open, support it under its declared contract, or eliminate it.

A probe candidate declares the outcome expected under each hypothesis.

The planner ranks probes by how many currently viable hypotheses they separate, with explicit cost/risk penalties.

This is deliberately a discriminative-power heuristic, not a calibrated probability model.

## Safety

- supported does not mean causal;
- an unlisted alternative explanation is not eliminated;
- missing evidence keeps hypotheses open;
- planner utility is not a truth score;
- no prior/posterior probability is emitted until calibration semantics exist.

## Empirical diagnostic calibration

Calibration summarizes reviewed outcomes per detector/source-style/proof-tier/version.
It records TP/FP/FN/Unknown, precision, recall, and reviewed sample size.

Calibration is descriptive evidence about historical detector behavior. It is not a truth score, posterior probability, Bug Report severity, or permission to override current evidence.
Segments below the configured reviewed-sample threshold remain `insufficient-sample`.

## Declarative diagnostic rules

Simple evidence-comparison rules may be represented declaratively when their required predicates, any-of alternatives, and false-positive guards are explicit.

Unknown required evidence yields `insufficient-evidence`; rules never guess missing predicates. Complex temporal, causal, or Minecraft-specific semantics remain in their canonical analyzers/reasoners.


## Game Design oracle

`intent-gate.ts` is the single owner for deciding whether an observation conflicts with intended gameplay.

When an applicable approved Game Design `intentRule` is available, the gate evaluates it before inferred gameplay intent:

- explicit exception or matching allowed behavior → `designed-behavior`;
- matching behavior that raises balance/UX concerns → `design-review`;
- unspecified/unclear expected behavior → `ambiguous-intent`;
- contradiction against authoritative authored/client design with evidence → `confirmed-defect`;
- contradiction against approved reconstruction → `probable-defect`.

Implementation code is evidence of implementation, not authority for intended gameplay. Missing intent fails closed instead of inventing a defect.


## Intent safety boundary

Diagnostic Reasoning must not convert implementation shape into gameplay intent.

A contradiction can become a confirmed defect only when intended behavior is grounded independently of the current implementation, such as approved Game Design, project policy, or authoritative documentation. Source-only authored/inferred intent remains ambiguous until independent intent authority exists.

Historical findings may guide where to inspect, but they do not prove a current defect. Runtime observation proves actual behavior, not intended behavior.


## Candidate discovery boundary

Candidate discovery is pre-report reasoning, not severity assignment and not bug publication.

The reusable candidate families are intentionally small:

- progression dead-end;
- objective loss;
- reset leakage;
- terminal-state conflict;
- multiplayer ownership conflict;
- critical inventory loss;
- entity route dead-end.

Each candidate rule declares the evidence pattern that must exist, the player-visible gameplay impact that must be grounded, and counter-evidence predicates that can explain or permit the behavior.

Counter-evidence is mandatory and fail-closed:

- present counter-evidence -> suppress the candidate;
- unresolved counter-evidence -> keep the candidate unresolved;
- cleared counter-evidence plus material player impact -> candidate may continue to intent/admission review.

This layer never assigns Blocker/Major/Minor. Severity remains owned by the bug-report decision layer after intent, impact, trigger, and counter-evidence gates are settled.
