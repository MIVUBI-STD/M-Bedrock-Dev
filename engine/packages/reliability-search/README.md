# Reliability Search

High-end bug-discovery search layer for M-Bedrock-Dev.

This package owns search strategy, not Minecraft semantics.

## Internal hierarchy

```text
src/
├── core/          shared search-layer types
├── search/        bounded exploration, schedules, state/session domains, search budgets
├── invariant/     mining, diversity, challenge, falsification, promotion and revalidation
├── mutation/      mutation operators, campaigns and effectiveness measurement
├── minimization/  graph/source/timing/counterexample reduction
├── coverage/      semantic/runtime coverage and known-limit projection
├── corpus/        retained semantic/runtime corpus and cross-map behavioral patterns
├── history/       search/campaign history analysis and persistence
├── blindspot/     blindspot aggregation and follow-up task derivation
├── robustness/    metamorphic and parser-robustness campaigns
└── index.ts       sole cross-owner public entrypoint
```

Tests mirror the same hierarchy under `test/`.

These folders are internal navigation groups, not separate semantic owners.

## Core engines

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

## Metamorphic testing

Metamorphic campaigns compare a baseline with caller-declared semantic-preserving variants.
Useful relations may include identifier rename when identity is non-semantic, formatting/minification changes, translated arena coordinates with equivalent relative topology, or independent declaration ordering.
The reliability layer never invents the equivalence relation; the semantic owner supplies it.

## Parser robustness

Deterministic malformed/edge-shape text cases exercise parser safety separately from gameplay mutation testing.
Robustness results measure parser behavior only. Harness errors are Detection Development evidence, not map defects.

## Cross-map behavioral pattern library

Reviewed map evidence may be aggregated into reusable behavioral patterns, implementation variants, and failure signatures.

Promotion is cross-map and conservative: a pattern remains a candidate until it has support from multiple distinct maps and no reviewed rejection.
Map IDs are provenance only; production detection logic must rediscover the pattern from artifact evidence rather than match map names.
