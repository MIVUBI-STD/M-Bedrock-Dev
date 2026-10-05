# Movement, Velocity, Knockback, Fall, and Physics-State Integrity

## Core problem

Position and velocity are separate state.

```text
player is at safe coordinate
!=
player has safe motion state
```

A teleport can succeed while old downward or horizontal momentum still causes immediate failure afterward.

## Physics-state contract

Critical transitions should define:

```text
expected position
expected dimension
velocity policy
containment bounds
input-lock relationship
airborne/grounded expectation if relevant
recovery behavior
```

## Teleport velocity

TeleportOptions has keepVelocity. Treat velocity as explicit:

- preserve
- clear
- replace with known vector

Do not leave it accidental for anti-void, revive, respawn, lobby return, or cutscene movement.

## Void recovery

Safer flow:

```text
detect out-of-bounds
↓
validate current generation
↓
normalize dangerous velocity
↓
safe teleport
↓
verify location + velocity
↓
resume gameplay
```

## Input lock is not physics lock

Movement input disabled does not imply zero velocity. A player can still drift/fall/be knocked while control is locked.

## Stuck diagnosis

Before marking AI/entity STALLED:

- inspect current velocity
- determine airborne/knockback context
- check collision/pushing
- check route progress

Physics-driven low progress is not automatically navigation failure.

## Knockback ownership

Scripted impulse/knockback should be generation-scoped like other deferred combat effects. Old callbacks must not move replacement entities or later-round players.

## Version sensitivity

Recent 1.26.x changes altered knockback/pushability semantics. Consult compatibility profile before diagnosing a post-update movement regression as project logic.

## Analyzer diagnostics

- PHYSICS_STATE_CONTRACT_MISSING
- PHYSICS_TELEPORT_VELOCITY_POLICY_UNDECLARED
- PHYSICS_RESIDUAL_VELOCITY_AFTER_TELEPORT
- PHYSICS_VOID_RECOVERY_PRESERVES_DANGEROUS_MOTION
- PHYSICS_STALE_KNOCKBACK_CALLBACK
- PHYSICS_KNOCKBACK_CROSSES_ARENA_BOUNDARY
- PHYSICS_INPUT_LOCK_ASSUMED_ZERO_VELOCITY
- PHYSICS_REVIVE_MOTION_BASELINE_MISSING
- PHYSICS_RESPAWN_MOTION_BASELINE_MISSING
- PHYSICS_FALSE_STUCK_DURING_FORCED_MOTION
- PHYSICS_MOUNT_RIDER_TRANSITION_UNDECLARED
- PHYSICS_POST_TRANSITION_VELOCITY_UNVERIFIED
- PHYSICS_KNOCKBACK_VERSION_REGRESSION
- PHYSICS_PUSHABILITY_VERSION_REGRESSION

## Review questions

1. What velocity policy should this teleport use?
2. Can old momentum immediately move the entity/player out of safety?
3. Does anti-void clear dangerous motion?
4. Can knockback cross arena boundaries?
5. Is the knockback callback generation-scoped?
6. Is input lock being confused with physical immobility?
7. Could current velocity explain an apparent navigation stall?
8. Does revive/respawn normalize motion?
9. Are rider and vehicle handled together?
10. Did a Minecraft update change knockback/pushability semantics?