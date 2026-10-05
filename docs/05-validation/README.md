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

## Runtime validation

- [Active runtime diagnosis](./active-runtime-diagnosis.md)
- [Runtime control](./runtime-control.md)
- [Runtime observation](./runtime-observation.md)
- [Runtime laboratory](./runtime-laboratory.md)
- [Live harness](./live-harness.md)
- [Live regression runner](./live-regression-runner.md)
- [Bedrock runtime probes](./bedrock-runtime-probes.md)
- [Bedrock runtime telemetry](./bedrock-runtime-telemetry.md)
- [Bedrock state observation](./bedrock-state-observation.md)

## Search and falsification

- [Bounded state exploration](./bounded-state-exploration.md)
- [Concurrency perturbation](./concurrency-perturbation.md)
- [Dynamic invariant mining](./dynamic-invariant-mining.md)
- [Invariant mining advanced](./invariant-mining-advanced.md)
- [Mutation testing](./mutation-testing.md)
- [Script and graph mutation](./script-and-graph-mutation.md)
- [Reliability search](./reliability-search.md)
- [Runtime search feedback](./runtime-search-feedback.md)

## Regression, retest, and portfolio

- [Regression](./regression.md)
- [Retest planning](./retest-planning.md)
- [Portfolio retest](./portfolio-retest.md)
- [Campaign history and minimization](./campaign-history-and-minimization.md)
- [History-driven search](./history-driven-search.md)
- [Blindspot portfolio](./blindspot-portfolio.md)

## Reliability and update evidence

- [Reliability strategy](./reliability-strategy.md)
- [Reliability catalogs](./reliability-catalogs.md)
- [Map fingerprint](./map-fingerprint.md)
- [Update intelligence](./update-intelligence.md)
- [Version-aware native correlation](./version-aware-native-correlation.md)

## Placement rule

This directory owns durable validation methods and proof contracts. Do not store date-stamped production proof reports, planning, one-off migration exposure reports, or chronological run logs here. New current execution/proof state must be owned by the canonical workspace/runtime state and rendered as a projection when needed. `docs/07-operations/` remains transitional compatibility during migration and must not gain new state authority. Historical evidence belongs in Git history or `engine/reliability/history/`.