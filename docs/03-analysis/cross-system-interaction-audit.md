# Cross-System Interaction Audit Matrix

## Purpose

Many serious gameplay bugs occur at the boundary between two individually-correct systems. This matrix prevents audits from reviewing domains only in isolation.

## Required rule

For every map, identify which systems are present, then review every materially relevant intersection.

Do not brute-force every possible pair. Review intersections that can share state, timing, ownership, rewards, world mutation, player control, or lifecycle.

## High-value intersections

```text
Reconnect × Death/Respawn
Reconnect × Inventory/Rewards
Reload × Timers
Reload × Delayed Spawn
Reload × UI/Form
Reload × Cinematic
Shop/UI × Combat Start
Retry × Progression
Retry × Rewards
Cleanup × Rewards
Cleanup × World Mutation
Cleanup × Entity Lifecycle
Capacity × Cinematic
Capacity × Performance Budget
Multi Arena × Gamerules
Multi Arena × Selectors
Multi Arena × Projectiles
Structure Load × Enemy Spawn
Structure Load × Teleport
Death × Objective Completion
Timeout × Objective Completion
Player Leave × Arena Ownership
Party Change × Ready/Countdown
Input Lock × Respawn
Spectator × Interaction
Effects × Respawn
Effects × Cleanup
```

## Review pattern

For each relevant intersection ask:

1. Can both systems act in the same tick/window?
2. Which system owns authority?
3. Can one system invalidate the other's pending work?
4. Is state revalidated before deferred work commits?
5. Can the combination duplicate, skip, or reorder a transition?
6. Can the combination leak state into another player/arena/round?
7. What happens on failure, retry, disconnect, reload, or cleanup?

## Output

Each applicable intersection is recorded in coverage as:

- checked;
- blocked, with reason; or
- not-applicable, with reason.

Any unsupported interaction model becomes a Detection Gap rather than silently disappearing.
