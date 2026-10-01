# Reliability Search Agent Rules

Applies to high-end bug-discovery search strategy under `packages/reliability-search/`.

## Boundary

This package owns search mechanics only:

- semantic/runtime coverage feedback;
- corpus retention;
- bounded state exploration;
- interleaving/schedule exploration;
- invariant challenge/falsification;
- mutation campaigns;
- deterministic minimization;
- search-history and blindspot feedback.

It may consume canonical domain models from `packages/reliability`, but it must not become a second owner of Bedrock runtime semantics, diagnostics, repair, or orchestration.

## Internal routing

Use the nearest internal group before reading broadly:

```text
search/        exploration, state/session domains, schedules and budgets
invariant/     invariant lifecycle and adversarial challenge
mutation/      mutation operators/campaigns/effectiveness
minimization/  failure reduction
coverage/      coverage and known-limit projections
corpus/        retained semantic/runtime examples and behavioral patterns
history/       longitudinal search/campaign evidence
blindspot/     missing-coverage/task derivation
robustness/    metamorphic/parser robustness
core/          shared package-local types
```

Cross-owner consumers still import through `src/index.ts`; these groups are navigation boundaries, not independent public packages.

## Rules

- Search must be deterministic for identical inputs/options.
- Every unbounded-looking loop must have an explicit budget.
- Canonical identities must be stable across property/object iteration order.
- Coverage is search feedback, never proof of correctness.
- Independence reduction must prefer false dependency over false independence.
- Preserve replayable traces for every discovered failure.
- Minimize reproducible failures before promoting them to durable regressions.
- Runtime divergence features describe observed difference classes; they do not redefine the underlying invariant.
- Keep source and test hierarchy aligned when adding a durable search family.
