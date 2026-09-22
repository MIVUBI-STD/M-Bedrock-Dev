# Concurrency and Timing Perturbation

Targeted timing exploration focuses on historical high-risk multiplayer/session behavior instead of generating arbitrary delays everywhere.

## Timed actions

A scenario is represented as:

```text
tick 0  → P1 join
tick 0  → P2 join
tick 1  → assign P1 arena1
tick 1  → assign P2 arena2
tick 2  → P1 start
tick 2+n→ P2 start
```

Current perturbation window for the known cutscene regression is 0–2 ticks between independent arena starts.

## Disturbances

Regression-specific generation can inject:

- player disconnect during start/cutscene;
- arena reset near concurrent start;
- same-tick ordering changes represented deterministically by insertion order.

The pure model remains deterministic. Timing perturbation changes event ordering, not model semantics.

## Cutscene isolation oracle

The dedicated concurrency oracle requires:

> if an arena contains a player in `starting`, that arena's own cutscene must be active.

It deliberately does not require other arenas to wait.

That makes the historical shared-cutscene-queue behavior observable as a runtime/model divergence once live snapshots are connected.

## Why targeted first

Blind random timing creates a large search space with weak interpretability.

Regression-driven perturbation gives:

- smaller counterexamples;
- clearer invariant ownership;
- better future runtime reproduction;
- lower test cost.
