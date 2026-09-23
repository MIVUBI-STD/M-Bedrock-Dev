# World Rules, Difficulty, Daylight, Weather, and Global State Isolation

## Core problem

Some Minecraft state is world-global, not arena-local.

Examples:

- pvp
- keepInventory
- doMobSpawning
- mobGriefing
- commandBlocksEnabled
- difficulty
- time/daylight cycle
- weather
- immediate respawn
- damage-related gamerules

Changing one for Arena A can affect Arena B immediately.

## Global-resource registry

Treat each world-global setting as a shared resource:

```text
setting
current value
baseline value
active owner(s)
lease generation
compatibility/conflict policy
```

## Global lease

A temporary request should capture:

```text
setting
previousValue
requestedValue
ownerArena/system
arenaGeneration
leaseGeneration
restoreCondition
```

## Conflict example

```text
Arena A requires pvp=false
Arena B requires pvp=true
```

Last-write-wins is invalid. Resolve by local emulation, serialization, rejection, or an explicitly supported shared policy.

## Prefer local emulation

For concurrent arenas prefer local logic when possible:

- friendly-fire filters instead of global pvp
- inventory transaction policy instead of keepInventory toggles
- scripted spawn ownership instead of global doMobSpawning changes
- local damage policy instead of global damage gamerules

## Restore safety

Do not blindly write the old value during cleanup.

Use compare-and-swap style reasoning:

```text
does this arena still own the current global value?
yes -> restore or handoff
no  -> stale cleanup must not overwrite newer owner
```

## Baseline verification

At worldLoad and when no lease remains, verify critical global settings match the declared project baseline.

## Cinematic time/weather

Time and weather changes are global-impact cinematics. Independent arena cutscenes should prefer camera/visual techniques if they require different simultaneous environments.

## Analyzer diagnostics

- WORLDSTATE_GLOBAL_RESOURCE_UNDECLARED
- WORLDSTATE_ARENA_TREATS_GAMERULE_AS_LOCAL
- WORLDSTATE_GLOBAL_LEASE_MISSING
- WORLDSTATE_CONFLICT_LAST_WRITE_WINS
- WORLDSTATE_STALE_RESTORE_OVERWRITES_NEW_OWNER
- WORLDSTATE_BASELINE_UNKNOWN
- WORLDSTATE_BASELINE_DRIFT
- WORLDSTATE_PVP_MULTI_ARENA_CONFLICT
- WORLDSTATE_KEEPINVENTORY_MULTI_ARENA_CONFLICT
- WORLDSTATE_DIFFICULTY_MULTI_ARENA_CONFLICT
- WORLDSTATE_MOBSPAWNING_GLOBAL_CONFLICT
- WORLDSTATE_TIME_WEATHER_CROSS_ARENA_EFFECT
- WORLDSTATE_COMMANDBLOCKS_GLOBAL_DISABLE_RISK
- WORLDSTATE_GLOBAL_MUTATION_NOT_AUDITED

## Review questions

1. Is this setting world-global or arena-local?
2. Who owns the current value?
3. Can another arena require a different value?
4. Is there a lease/conflict policy?
5. Can local script logic emulate the arena-specific behavior instead?
6. Can stale cleanup overwrite a newer owner?
7. What is the baseline value?
8. Is baseline revalidated on worldLoad?
9. Does a cinematic alter time/weather globally?
10. Could toggling this rule break command blocks, spawning, combat, or inventory in another arena?