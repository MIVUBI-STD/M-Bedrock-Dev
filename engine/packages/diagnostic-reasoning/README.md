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
