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
