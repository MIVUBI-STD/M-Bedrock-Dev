# Arena Reset, Cleanup, and Reusability Integrity

## Core problem

Many Bedrock arena bugs are not first-run bugs.

```text
run 1 works
↓
cleanup incomplete
↓
run 2 inherits residue
↓
run 2 or run 3 fails
```

## Reset transaction

```text
FREEZE
↓
INVALIDATE
↓
CLEAN
↓
RESTORE_BASELINE
↓
VERIFY_EMPTY
↓
READY_FOR_NEXT_GENERATION
```

## FREEZE / INVALIDATE

Before cleanup, stop accepting gameplay input and invalidate the ending arenaGeneration, timers, countdowns, revive transactions, forms, teleports, AI recovery, objective progress, and new spawns.

## Cleanup surface registry

Each arena should explicitly own gameplay entities, projectiles, dropped items, inventory/equipment state, effects, tags, scoreboard mirrors, transient dynamic properties, modified world geometry, timers, forms, input locks, teleport/recovery callbacks, AI monitors, objective state, and spectator/cutscene state.

## Player normal form

After leaving an arena, player state should converge to a declared baseline: correct lobby location and gamemode, no arena input locks, no stale spectator state, inventory according to lobby policy, no stale ready/downed/revive state, no arena-owned effects, no old forms/timers, and no arena membership.

## VERIFY_EMPTY

Do not mark an arena available because cleanup functions returned.

Verify old critical entities and projectiles are gone, old-generation callbacks are invalid, transient registries are empty, score/tag mirrors are baseline, world geometry is baseline, players are detached from the ending generation, and input locks are reconciled.

Only then allow the next generation.

## Dirty arena quarantine

If baseline cannot be proven, transition RESET_FAILED -> QUARANTINE. Do not allow join, countdown, or setup until recovery succeeds.

## Repeatability proof

A high-quality arena should satisfy approximate reset symmetry: initial baseline equals post-reset baseline. Static analysis can look for missing inverse operations; live tests later can compare snapshots across run 1, run 2, run 5, and beyond.

## Analyzer diagnostics

- CLEANUP_GENERATION_NOT_INVALIDATED_FIRST
- CLEANUP_SURFACE_REGISTRY_MISSING
- CLEANUP_ENTITY_RESIDUE
- CLEANUP_PROJECTILE_RESIDUE
- CLEANUP_TIMER_RESIDUE
- CLEANUP_FORM_RESIDUE
- CLEANUP_INPUT_LOCK_RESIDUE
- CLEANUP_SCOREBOARD_RESIDUE
- CLEANUP_TAG_RESIDUE
- CLEANUP_PLAYER_STATE_NOT_NORMALIZED
- CLEANUP_WORLD_BASELINE_UNVERIFIED
- CLEANUP_NEW_GENERATION_OVERLAP
- CLEANUP_NOT_IDEMPOTENT
- CLEANUP_DIRTY_ARENA_REOPENED
- CLEANUP_CROSS_ARENA_OVER_CLEAR
- CLEANUP_REPEATABILITY_EVIDENCE_MISSING

## Review questions

1. Is old generation invalidated before cleanup?
2. What exact resources does this arena own?
3. Does every setup mutation have a cleanup or reset inverse?
4. Are projectiles and dropped items included?
5. Are player input, gamemode, and inventory states normalized?
6. Is baseline structure or world state verified?
7. Can cleanup be retried safely?
8. Can new setup overlap old cleanup?
9. What happens if cleanup verification fails?
10. Is there evidence the arena remains clean across repeated runs?