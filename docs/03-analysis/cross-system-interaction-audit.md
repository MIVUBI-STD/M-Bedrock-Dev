# Cross-System Interaction Audit Matrix

> **Supporting STRESS contract only.** Cross-system checks are activated by the canonical Mandatory Gameplay Audit Procedure and C9. This document never creates an independent checklist/status authority.

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
Player Capability × Permission/Admin Bypass
Player Capability × Gamerules / World Settings
Roommaster/Operator × Arena Protection
Client Prediction × Cancelled World Mutation
Waterlogging/Liquid Use × Interaction Guard
Physical Boundary × Barrier/Collision Geometry
```

## Mandatory crosscheck dimensions

A contradiction is not considered fully reviewed by checking only one nearby guard. Search the dimensions that are materially relevant to the scenario:

```text
guard
scope
exclusion
owner             when shared/multiplayer/resource-owned
generation        when retry/reload/reconnect/reuse/deferred work exists
cleanup           when terminal/replay/reuse/resource release exists
```

For each contradiction distinguish:

```text
Gameplay mismatch
vs
Technical explanation / constraint
vs
Actual counter-proof
```

A platform limit, queue, fallback, performance safeguard, or implementation constraint is an explanation/mitigation unless it proves the player-visible mismatch is not real. It must not be used as blocking counter-proof by itself.

## Review pattern

For each relevant intersection ask:

1. Can both systems act in the same tick/window?
2. Which system owns authority?
3. Can one system invalidate the other's pending work?
4. Is state revalidated before deferred work commits?
5. Can the combination duplicate, skip, or reorder a transition?
6. Can the combination leak state into another player/arena/round?
7. What happens on failure, retry, disconnect, reload, or cleanup?
8. Is the protection actually active in production, or merely implemented but unregistered/uninstantiated?
9. Does a physical/world-level Blocking Proof invalidate the suspected software-level path?
10. Can client-predicted state diverge from the server when the action is cancelled or rewritten?

## Output

Each applicable intersection is recorded in coverage as:

- checked;
- blocked, with reason; or
- not-applicable, with reason.

Any unsupported interaction model becomes a Detection Gap rather than silently disappearing.
