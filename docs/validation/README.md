---
id: document.validation.router
class: DOCUMENT
domain: validation
role: ROUTER
authority: CANONICAL
lifecycle: ACTIVE
---

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

## Runtime proof

- [Runtime Proof](./runtime-proof.md) — canonical runtime diagnosis, control, observation, probes, telemetry, experiments, harness, and runtime-last policy.

## Search and falsification

- [Search and Falsification](./search-and-falsification.md) — canonical bounded exploration, concurrency pressure, invariant challenge, mutation testing, semantic search, minimization, and runtime feedback.

## Retest and regression

- [Retest and Regression](./retest-and-regression.md) — canonical regression asset ownership, history-driven prioritization, map retest, and portfolio retest.

## Placement rule

This directory owns durable validation methods and proof contracts. Do not store date-stamped production proof reports, planning, one-off migration exposure reports, or chronological run logs here. New current execution/proof state must be owned by the canonical workspace/runtime state and rendered as a projection when needed. Historical evidence belongs in Git history or `engine/reliability/history/`.