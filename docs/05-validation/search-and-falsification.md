# Search and Falsification

## Purpose

Canonical validation strategy for systematically challenging the current model, detector stack, and gameplay invariants without brute-force testing.

## Strategy order

```text
bounded state exploration
→ concurrency/interleaving perturbation
→ invariant challenge
→ mutation testing
→ semantic coverage-guided search
→ failure minimization
→ runtime divergence feedback
```

Use only the strategies applicable to the selected subsystem/risk.

## Bounded state exploration

Use deterministic bounded exploration for small critical state spaces. Require explicit depth/state budgets and report truncation.

Prefer shortest counterexamples and canonical state identity.

## Concurrency and interleaving

Explore timing only around shared resources, ownership boundaries, terminal transitions, reconnect/retry, deferred work, and historically high-risk windows.

Conservative dependency footprints are preferred: false dependency costs time; false independence can hide a defect.

## Invariant mining

Runtime traces may suggest candidate invariants, but observation frequency never defines correctness automatically.

Promotion requires:
- sufficient support;
- state diversity;
- relevant version coverage;
- no known-good counterexample;
- challenge against historical failures and mutation survivors;
- explicit review before becoming durable invariant knowledge.

## Mutation testing

Mutation testing evaluates the detector stack, not the current map.

Useful mutation families include:
- selector broadening;
- coordinate shifts;
- broken references;
- dropped/duplicated event subscriptions;
- dynamic-property substitution;
- lifecycle/reset/reconnect mistakes;
- concurrency/shared-lock defects.

Results:

```text
KILLED
SURVIVED
INVALID
```

A survived mutant is detection debt and should route to a stronger analyzer, invariant, search scenario, or runtime proof capability.

## Semantic coverage-guided search

Keep a candidate only when it adds meaningful semantic coverage or exposes failure.

Coverage signals may include:
- state/transition novelty;
- ownership/interleaving novelty;
- invariant violation;
- runtime divergence signature;
- previously uncovered failure family.

Coverage guides search; it is not safety proof.

## Runtime feedback

Real runtime divergences feed search prioritization and corpus growth. They may seed targeted scenario mutation, timing perturbation, minimization, and new mutation operators.

Runtime evidence must not rewrite model correctness rules automatically.

## Failure minimization

Minimize reproducible failures to the smallest sequence preserving the same failure predicate. A minimizer must refuse inputs that do not reproduce.

## STOP

Stop search expansion when the relevant risk family has sufficient proof/counter-proof or when the remaining uncertainty is one bounded runtime claim. Do not keep fuzzing for reassurance.
