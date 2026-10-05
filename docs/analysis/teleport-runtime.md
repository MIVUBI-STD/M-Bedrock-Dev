# Teleport, Dimension Transfer, and Spawn Safety

## Core problem

A teleport request is not the same as a successful gameplay transition.

```text
destination chosen
↓
destination ready
↓
spatial safety validated
↓
teleport applied
↓
location/dimension verified
↓
gameplay state committed
```

## Destination contract

Each critical destination should define:

```text
dimension
position
rotation/facing
collision policy
chunk readiness
arena ownership
generation
fallback chain
post-teleport expected state
```

Coordinates without dimension/scope are incomplete identity.

## Single teleport owner

Potential competing owners include:

- lobby return
- arena start
- respawn
- cutscene
- revive/downed recovery
- anti-void recovery
- persistence recovery
- developer/admin flow

Use one accepted owner per transition/generation.

## Cross-dimension preflight

Before moving a player:

```text
resolve dimension
↓
load destination chunks
↓
verify required world mutation/structure
↓
validate safe volume
↓
teleport
↓
verify actual dimension/location
↓
commit arena state
```

## Collision safety

When safety matters, use a collision-aware path such as tryTeleport/checkForBlocks or explicit occupancy validation.

Do not only check one block beneath the target. Player/entity volume may intersect surrounding blocks or be placed over a dangerous fall.

## Spawnpoint is separate

```text
setSpawnPoint != teleport now
teleport now != redefine future spawnpoint
```

Keep immediate routing and future respawn routing as separate authorities.

## Multiplayer transfer barrier

For group arena entry:

```text
P1 success
P2 success
P3 failure
P4 success
```

Do not blindly mark all participants ACTIVE.

Resolve according to the mode's transfer contract:

- retry failed participant
- replace/drop participant
- abort group transfer
- use configured quorum

## Analyzer diagnostics

- TELEPORT_DESTINATION_CONTRACT_MISSING
- TELEPORT_STALE_GENERATION
- TELEPORT_MULTIPLE_OWNERS
- TELEPORT_DESTINATION_CHUNK_NOT_READY
- TELEPORT_DESTINATION_STRUCTURE_NOT_VERIFIED
- TELEPORT_COLLISION_SAFETY_UNCHECKED
- TELEPORT_RESULT_UNVERIFIED
- TELEPORT_WRONG_DIMENSION
- TELEPORT_STATE_COMMITTED_BEFORE_LOCATION
- TELEPORT_SPAWNPOINT_CONFUSED_WITH_TRANSFER
- TELEPORT_SAFE_VOLUME_INCOMPLETE
- TELEPORT_FALLBACK_MISSING
- TELEPORT_GROUP_PARTIAL_TRANSFER
- SPAWN_ENTITY_UNLOADED_CHUNK
- SPAWN_ENTITY_WORLD_BOUNDARY
- RESPAWN_POINT_ARENA_DRIFT

## Review questions

1. Who owns this teleport?
2. What generation owns it?
3. Is dimension part of destination identity?
4. Are destination chunks ready?
5. Is required arena structure verified?
6. Is the entire occupancy volume safe?
7. What happens if teleport fails?
8. Is actual post-teleport location verified?
9. Is future spawnpoint being changed intentionally?
10. For group transfer, what happens when only some players succeed?
