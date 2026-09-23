# Block, Container, Door, and Interactive World Object State Integrity

## Core problem

An interactive object is more than its block type.

```text
type
permutation/state
components
container contents
redstone/automation coupling
arena ownership
```

All may affect gameplay.

## Object-state contract

Critical objects should declare:

```text
dimension/location
expected block type
required permutation states
relevant components
container baseline
automation coupling
arenaGeneration
```

## Type is not enough

A spruce door can exist while still being closed. A gate can exist with the wrong facing/open state. A button/plate can have a powered state different from the expected baseline.

Verify the actual permutation when route or gameplay behavior depends on it.

## Containers

Container lifecycle is separate:

```text
block exists
↓
inventory component exists
↓
container valid
↓
contents match expected state
```

A reset that restores the chest block but not the intended contents is incomplete.

## Structure restore

After structure load:

- reacquire block
- verify type
- verify permutation
- verify container/component state
- verify route/automation coupling

Do not trust the structure request alone.

## Route integration

Doors, gates, trapdoors, and bridge mechanisms must feed actual state into AI/path and player-route verification.

## Loot/economy integration

Reward containers must share idempotency/claim identity with loot-economy rules so repeated structure restoration cannot recreate already-claimed rewards.

## Automation integration

A permutation/component change on a redstone-coupled object invalidates affected automation graph assumptions.

## Analyzer diagnostics

- BLOCK_OBJECT_CONTRACT_MISSING
- BLOCK_TYPE_MATCH_STATE_MISMATCH
- BLOCK_PERMUTATION_UNVERIFIED
- BLOCK_DOOR_OPEN_STATE_WRONG
- BLOCK_GATE_ROUTE_STATE_WRONG
- BLOCK_CRITICAL_OBJECT_UNLOADED
- BLOCK_STALE_HANDLE_AFTER_MUTATION
- BLOCK_CONTAINER_COMPONENT_MISSING
- BLOCK_CONTAINER_BASELINE_DRIFT
- BLOCK_CONTAINER_RESET_DUPLICATES_LOOT
- BLOCK_CONTAINER_CONCURRENT_ACCESS_UNMODELED
- BLOCK_STRUCTURE_RESTORE_STATE_UNVERIFIED
- BLOCK_AUTOMATION_STATE_INVALIDATED
- BLOCK_ROUTE_STATE_NOT_LINKED_TO_NAVIGATION
- BLOCK_RESET_BASELINE_UNVERIFIED

## Review questions

1. Is type alone sufficient for this object?
2. Which permutation states matter?
3. Does the object have an inventory/container component?
4. What should its baseline contents be?
5. Can players or automation mutate it concurrently?
6. Does structure restore recreate already-claimed contents?
7. Is the object's open/powered state part of AI route validity?
8. Does changing it invalidate redstone/command automation?
9. Are references reacquired after mutation/chunk lifecycle changes?
10. Does reset verify the full object state, not only the block type?