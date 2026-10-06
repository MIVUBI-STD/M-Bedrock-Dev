---
id: document.validation.search-and-falsification
class: DOCUMENT
domain: validation
role: GUIDE
authority: CANONICAL
lifecycle: ACTIVE
---

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

## Generative multiplayer and model testing

For small session/multiplayer domains, generate action sequences against a deterministic expected state model before live Minecraft automation.

Example lifecycle:

```text
lobby
→ assigned
→ starting
→ playing
→ completed
→ reset / reassigned
```

Generated actions may include join, assign, start, progress, complete, disconnect, reconnect, and reset when those actions exist in the model.

Property-based generation is useful only when backed by explicit invariants, such as:
- one authoritative arena/session per player;
- assignment and membership agree;
- disconnected players do not retain active progress;
- playing requires a valid connected assignment;
- independent arenas remain independent.

Generated/model failures are search evidence, not Minecraft runtime proof. Runtime adapters may later project observed state into the same invariant model.

## Source mutation detection

Source mutants must be evaluated through the same production analyzers used by normal inspection. The search/mutation layer generates the mutant; it does not become a second parser or diagnostic owner.

Examples:

```text
selector broadening
→ command/state-scope analysis
→ newly broadened mutation scope?

reference redirect
→ reference graph
→ newly unresolved target?

coordinate shift
→ topology comparison
→ newly introduced spatial outlier?
```

A mutation survives when the existing analyzer stack cannot distinguish it from baseline under the available evidence. Survival is useful detector-gap evidence; do not force a kill.

Pre-existing findings do not count as detecting a mutant unless the mutation introduces the relevant new evidence.