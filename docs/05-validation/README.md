# Validation

Canonical proof and evidence policy for product behavior.

## Proof vocabulary

```text
STATIC VERIFIED
PACKAGE VERIFIED
LOCAL GAME VERIFIED
LIVE GAME VERIFIED
UNKNOWN
```

Use the lowest-cost evidence that can falsify a claim. Never promote source/static/package evidence into Minecraft runtime proof.

## Core proof and repair validation

- [Package proof](./package-proof.md)
- [Repair validation](./repair-validation.md)
- [Source mutation detection](./source-mutation-detection.md)
- [Invariant revalidation](./invariant-revalidation.md)

## Runtime proof

- [Runtime Proof](./runtime-proof.md) — canonical runtime diagnosis, control, observation, probes, telemetry, experiments, harness, and runtime-last policy.

## Search and falsification

- [Search and Falsification](./search-and-falsification.md) — canonical bounded exploration, concurrency pressure, invariant challenge, mutation testing, semantic search, minimization, and runtime feedback.

## Retest and regression

- [Retest and Regression](./retest-and-regression.md) — canonical regression asset ownership, history-driven prioritization, map retest, and portfolio retest.
- [Blindspot portfolio](./blindspot-portfolio.md) — retained only where it adds distinct portfolio-level coverage semantics.

## Reliability and update evidence

- [Reliability strategy](./reliability-strategy.md)
- [Reliability catalogs](./reliability-catalogs.md)
- [Map fingerprint](./map-fingerprint.md)
- [Update intelligence](./update-intelligence.md)
- [Version-aware native correlation](./version-aware-native-correlation.md)

## Placement rule

This directory owns durable validation methods and proof contracts. Do not store date-stamped production proof reports, planning, one-off migration exposure reports, or chronological run logs here. New current execution/proof state must be owned by the canonical workspace/runtime state and rendered as a projection when needed. `docs/07-operations/` remains transitional compatibility during migration and must not gain new state authority. Historical evidence belongs in Git history or `engine/reliability/history/`.