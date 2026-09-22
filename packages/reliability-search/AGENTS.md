# Reliability Search Agent Rules

Applies to high-end bug-discovery search strategy under packages/reliability-search/.

## Boundary

This package owns search mechanics only:

- semantic coverage;
- corpus retention;
- bounded state exploration;
- interleaving/schedule exploration;
- minimization;
- future mutation-search strategy.

It may consume canonical domain models from packages/reliability, but it must not become a second owner of Bedrock runtime semantics, diagnostics, repair, or orchestration.

## Rules

- Search must be deterministic for identical inputs/options.
- Every unbounded-looking loop must have an explicit budget.
- Canonical identities must be stable across property/object iteration order.
- Coverage is search feedback, never proof of correctness.
- Independence reduction must prefer false dependency over false independence.
- Preserve replayable traces for every discovered failure.
- Minimize reproducible failures before promoting them to durable regressions.
- Runtime divergence features describe observed difference classes; they do not redefine the underlying invariant.
