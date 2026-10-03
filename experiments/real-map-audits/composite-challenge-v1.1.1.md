# Real Map Audit — Composite Challenge v1.1.1

Status: source-proven real-map audit evidence

Target artifact SHA-256: `c7a208ccb943d214de6bb6d2f15f265f8dba2b794ae56da40a11bef24162776a`

## Proven finding 1

### BUG — Arena-specific ticking areas are declared but never created

Severity: Blocker

Composite defines arena-specific ticking areas for every arena, but the only runtime `tickingarea add` path reads `WorldData.tickingarea`, which contains only `lobby` and `permission`. The per-arena `tickingAreas` configuration is offset for all six arenas but is never materialized into Minecraft ticking areas. A raw DB string search also found no persisted arena ticking-area names such as `arena_1_red_team` or `arena_1_blue_team`.

Expected: started arenas must create their declared simulation regions before remote spawn/pathing/structure logic depends on them.

Observed source evidence:
- `chunk-WYD2CS7M.js`: arena template declares `arena_1_red_team`, `arena_1_blue_team`, and lobby ticking areas.
- `chunk-WYD2CS7M.js`: `createArenaConfig()` clones/offsets the two arena regions for all six arenas.
- `chunk-KPA6ZKUE.js`: `WorldManager.applyTickingAreas()` is the only `tickingarea add` implementation in the selected artifact.
- `chunk-KPA6ZKUE.js`: `WorldData.tickingarea` contains only lobby and permission.
- Selected-artifact search found no second arena ticking-area creation owner.
- Raw world DB search found no persisted arena ticking-area names for arenas 1, 2, or 6.

Player-visible consequence: gameplay becomes dependent on player-loaded chunks; distant entity spawning/pathing/wave progression can fail.

Repair direction: keep one arena simulation-residency owner and create/release the selected arena's declared regions as part of arena lifecycle, or replace this unused contract with another proven residency mechanism.

## Proven finding 2

### BUG — Disconnect during preload can bypass the fresh-session inventory wipe

Severity: Major

Composite performs its full inventory clear only against `getArenaOnlinePlayers(arenaId)` during preload. A player who disconnects before that callback and reconnects after it has run is not cleared. The `preloading` reconnect path only restores gameplay state/teleports the player.

When preparation starts, `KitManager.applyArenaLoadouts()` runs with `clearAllSlots: false`, so the missed full reset is not replayed. The kit manager's chest-slot mapping addresses only a bounded managed-slot surface, while `clearAllInventoryForLoadout()` is the only path that explicitly wipes the full inventory.

Source evidence:
- `chunk-2GRFUQFH.js:13939+` — preload calls `clearArenaPlayerItems(arenaId)`.
- `chunk-2GRFUQFH.js:14006+` — full clear only iterates currently online arena players.
- `chunk-2GRFUQFH.js:13182+` — reconnect during `preloading` configures/teleports but does not clear inventory.
- `chunk-2GRFUQFH.js:14771+` — preparation loadout refresh uses `clearAllSlots: false`.
- `chunk-2GRFUQFH.js:2255+` — managed chest-slot mapping is not equivalent to a full 36-slot inventory wipe.
- `chunk-2GRFUQFH.js:3812+` — `clearAllInventoryForLoadout()` is the explicit full-slot cleanup path.

Reproduction:
1. Put a recognizable non-session item in an inventory slot not replaced by the active kit.
2. Join/start an arena.
3. Disconnect before the preload inventory-clear callback.
4. Reconnect after that callback while the session is still `preloading`.
5. Let preparation/buy phase start.
6. Observe the stale item surviving into the new session.

Player-visible consequence: stale/unintended inventory can cross the fresh-session boundary and affect balance, economy, or reproducibility.

Repair direction: make the fresh-session inventory reset a per-player session invariant and reconcile it on reconnect before preparation/gameplay continuation.

## Next action

Continue one final current-source pass for independently proven Composite defects, then close this map for the real-test batch before moving to the next current Drive artifact.
