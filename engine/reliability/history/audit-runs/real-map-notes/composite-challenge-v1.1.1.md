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

## Proven finding 3

### BUG — Arena becomes reusable while asynchronous world reset is still running

Severity: Blocker

Composite resets the arena map over multiple ticks, but `resetGame()` does not await that reset. It immediately unlocks/clears parties and saves the session back to `idle`. Start validation checks party membership/readiness only and has no reset-in-progress guard.

Source evidence:

- `chunk-2GRFUQFH.js:7881+` — `ResetMapService.resetMap()` returns a Promise and splits the reset region into chunks.
- `chunk-2GRFUQFH.js:7951+` — `processChunksOverTime()` processes only `chunksPerTick` then schedules itself with `system.run()`, so reset materially spans later ticks.
- `chunk-2GRFUQFH.js:16014+` — `resetGame()` calls `resetArenaPlacedBlocks()` without awaiting completion.
- `chunk-2GRFUQFH.js:16027+` — `resetArenaPlacedBlocks()` explicitly discards the Promise with `void ResetMapService.resetMap(...)`.
- The same reset path then saves the arena's default session with `status: "idle"`.
- `chunk-2GRFUQFH.js:13756+` / `21770+` — `validateStart()` checks party size/readiness only; it does not consult `ResetMapService.resetStateByArena` / `resettingArenaIds`.
- Repository-wide search shows those reset-lock collections are internal to ResetMapService and are not used by game start admission.

Reproduction:
1. Run an arena and alter reset-managed blocks.
2. Trigger reset/end so `ResetMapService.resetMap()` starts.
3. Before the chunked reset finishes, make the arena party ready again.
4. Start/auto-start the same arena.
5. The session can enter countdown/preload while reset chunks are still mutating the arena.
6. Observe new-session world state being changed underneath setup/gameplay.

Player-visible consequence: new sessions can begin on a partially reset arena, producing missing/restored blocks at the wrong time, inconsistent build state, structure overlap, pathing changes, or non-deterministic gameplay.

Root cause: arena lifecycle publishes `idle` before reset completion, while the reset lock is not part of start admission.

Repair direction: keep the arena unavailable until the existing reset Promise settles, or make the existing reset lock part of canonical start admission. Do not add a second reset-state owner.


## Proven finding 4 — deep multi-arena pass

### BUG — Cleanup in one arena can invalidate another arena's active flag carrier

Severity: Major  
Proof: source-proven  
Domain: arena-multi-arena / objective state / cleanup isolation

#### Issue

Composite Attack keeps per-arena carrier identity in `flagStates`, but the player marker used to validate carrier state is the single global tag `ctf_composite_attack_flag_carrier`.

`FlagService.cleanup(arenaId)` is called on normal level completion, retry, reset, forced level transition, and attempt cleanup. Despite receiving one arena ID, cleanup removes that global carrier tag from **every online player**.

A second arena may therefore have a valid active flag carrier whose per-arena `carrierPlayerId` remains intact while another arena's cleanup removes the tag required by `isCarrierPlayer()`. On the next tick the second arena treats its carrier as invalid/dead and runs carrier-death handling.

#### Source evidence

- `FLAG_CARRIER_TAG = "ctf_composite_attack_flag_carrier"` is shared by every arena.
- `captureFlag(arenaId, player)` adds that generic tag while storing the carrier ID in the arena-specific state.
- `isCarrierPlayer(arenaId, player)` requires both the per-arena carrier ID and the generic tag.
- `cleanup(arenaId)` loops `world.getPlayers()` and removes `FLAG_CARRIER_TAG` from every player.
- Normal per-arena transitions call `FlagService.cleanup(arenaId)` independently.

#### Reproduction path

1. Run Composite Attack gameplay concurrently in Arena A and Arena B.
2. In Arena B, take the red flag and remain alive as the active carrier.
3. Complete/retry/reset a level in Arena A so Arena A calls `FlagService.cleanup(A)`.
4. Arena A cleanup removes the generic carrier tag from Arena B's carrier.
5. Allow Arena B's next flag tick to run.
6. Observe Arena B drop/return the flag even though its carrier did not die or disconnect.

#### Player-visible consequence

Progress in one arena can directly invalidate the core capture-the-flag objective state of another active arena.

#### Root cause

Carrier identity is split between arena-local state and a world-global player tag, while per-arena cleanup treats the global tag as arena-owned.

#### Repair direction

Make the carrier tag arena-specific, or remove it only from the carrier owned by the arena being cleaned. Keep `flagStates` as the existing per-arena authority.

## Proven finding 5 — deep multi-arena pass

### BUG — Active arena floor maintenance mutates blocks around players outside that arena

Severity: Minor  
Proof: source-proven  
Domain: arena-multi-arena / world interaction / isolation

#### Issue

Both Composite Defense and Attack GameManagers describe floor maintenance as operating around players in active arenas, but each active arena executes:

```text
execute as @a at @s run fill ~4 ~3 ~4 ~-4 ~-3 ~-4 grass_path replace dirt
```

The selector is world-global and is not restricted to the current arena's party/player set.

#### Expected

An active arena's maintenance mutation must affect only players belonging to that active arena.

#### Observed source behavior

For every active arena, the maintenance interval runs the fill command as every player in the dimension. Players in the lobby, waiting arenas, or other active/inactive arenas can therefore have nearby dirt converted to grass path because an unrelated arena is active.

#### Reproduction path

1. Keep Player A outside the active Composite arena, for example in the lobby or another inactive arena, standing near dirt.
2. Start gameplay in Arena B.
3. Wait for the periodic arena-floor maintenance interval.
4. Observe dirt around Player A convert to grass path despite Player A not belonging to Arena B.

#### Player-visible consequence

One arena can mutate world state around unrelated players and other arena surfaces.

#### Root cause

The maintenance loop is arena-scoped, but the actual command target is global `@a` instead of the arena's online player set.

#### Repair direction

Run the existing fill only for `getArenaOnlinePlayers(arenaId)` / the canonical arena-player owner, matching the scoped pattern already used by other per-arena maintenance paths.

## Next action

Composite v1.1.1 currently has five independently source-proven gameplay findings after the deep multi-arena pass: two Blockers, two Majors, and one Minor. Keep newly added findings in non-canonical audit evidence until explicit approval.
