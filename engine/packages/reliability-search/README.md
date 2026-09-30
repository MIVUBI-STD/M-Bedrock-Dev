# Reliability Search

High-end bug-discovery search layer for M-Bedrock-Dev.

This package owns search strategy, not Minecraft semantics.

Core engines include:

- semantic coverage-guided corpus search;
- bounded state exploration;
- concurrency schedule exploration;
- explicit happens-before constraints;
- hidden engine dependency surfaces;
- deterministic failure minimization;
- invariant mining and adversarial falsification.

## Concurrency rule

Declared read/write disjointness is not enough to prove independence.

The search engine may also use:

- explicit happens-before edges;
- causal/generation/event ordering;
- hidden engine surfaces such as event ordering, callback ordering, chunk residency, and network input ordering.

A cyclic happens-before graph is invalid.

## Invariant promotion rule

Passive support is never sufficient for invariant promotion.

```text
mined support
→ diversity checks
→ historical contradiction challenge
→ relevant adversarial mutation campaign
→ falsification receipt
→ promotion draft
```

A supported candidate with no relevant adversarial mutation attempt receives an `insufficient` falsification receipt.

A surviving relevant mutation or historical contradiction fails the receipt.

Only a `passed` receipt may authorize an invariant promotion draft.

## Principles

- deterministic/replayable search before random stress;
- keep only inputs that add semantic coverage;
- explicit search budgets;
- canonical state/trace identities;
- never treat coverage as proof of safety;
- never treat absence of counterexamples as invariant proof;
- minimize every reproducible failure before promoting it to the regression corpus.
