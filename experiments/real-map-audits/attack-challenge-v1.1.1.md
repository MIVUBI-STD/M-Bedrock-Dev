# Real Map Audit — Attack Challenge v1.1.1

Status: source-proven real-map audit evidence  
Authority: selected current Drive artifact only  
Historical regression ingestion: not yet approved  
Runtime execution: not performed

## Target

- Drive folder: `Challenge - Attack Map`
- Drive file: `Attack Challenge v1.1.1.mcworld`
- Drive file ID: `14JStk_EK0XlAyBTdPLyUE2lCKyk9BKpX`
- Artifact SHA-256: `95bf318070b3948f0a0d1d093bae2f7b1a3a37e4d94e94d2adfc4d80a501ccba`
- Behavior Pack manifest version: `1.1.1`
- Behavior Pack min engine version: `1.21.130`

## Proven finding 1

### BUG — Disconnect during preload can bypass the fresh-session full inventory wipe

Severity: Major  
Proof: source-proven  
Domain: player-state / inventory / reconnect lifecycle

#### Issue

Attack performs the fresh-session full inventory wipe only for players who are online when the timed preload callback runs. A party member who disconnects before that callback and reconnects after it has executed is not cleared. The reconnect handler for `preloading` restores gameplay state and teleports the player, but does not replay the missed full inventory wipe.

The first buy-phase loadout then uses `clearAllSlots: false`, and the non-full-clear loadout path only removes kit-managed items (items whose `lockMode` is `inventory`). Ordinary stale items are deliberately preserved/moved rather than globally cleared.

#### Expected

Every player entering a fresh Attack session must pass the same full-inventory reset boundary regardless of disconnect/reconnect timing.

#### Observed source behavior

1. Initial preload performs the full wipe only inside a timed callback:

```text
behavior_packs/BP/scripts/chunks/chunk-Y6V6JTGX.js:6485+
runPreload()
→ timed callback
→ teleportArenaPlayers(...)
→ clearArenaPlayerItems(arenaId)
```

2. `clearArenaPlayerItems()` only clears currently online arena players:

```text
chunk-Y6V6JTGX.js:6630+
clearArenaPlayerItems()
→ getArenaOnlinePlayers(arenaId)
→ player.runCommandAsync("clear @s")
```

3. Reconnect during `preloading` does not replay the missed wipe:

```text
chunk-Y6V6JTGX.js:5742+
session.status === "preloading"
→ configure gameplay state
→ teleport
→ no clear @s
→ no full-clear loadout
```

4. The first buy phase explicitly applies loadouts with `clearAllSlots: false`:

```text
chunk-Y6V6JTGX.js:7325+
KitManager.applyArenaLoadouts(... {
  clearAllSlots: false
})
```

5. With `clearAllSlots: false`, `applyPlayerLoadout()` calls `clearKitManagedItems()`, not `clearAllInventoryForLoadout()`:

```text
chunk-Y6V6JTGX.js:4148+
if clearAllSlots
  clearAllInventoryForLoadout()
else
  clearKitManagedItems()
```

6. `clearKitManagedItems()` scans inventory/equipment but removes only items marked as kit-managed (`lockMode === "inventory"`). Ordinary stale items remain. `applySnapshotToPlayer()` even moves a non-kit item out of a managed destination slot into another free slot rather than deleting it:

```text
chunk-Y6V6JTGX.js:4250+
existing && !isKitManagedItem(existing)
→ moveInventoryItemOutOfSlot(...)
```

```text
chunk-Y6V6JTGX.js:4276+
clearKitManagedItems()
→ only remove isKitManagedItem(item)
```

#### Reproduction path

1. Join a valid Attack party and carry an ordinary recognizable item from outside the new session.
2. Start the match.
3. Disconnect before the preload callback reaches `clearArenaPlayerItems()`.
4. Reconnect after that callback has executed while the session is still `preloading`.
5. Reconnect handler teleports the player without a full wipe.
6. Let the initial buy phase begin.
7. `clearAllSlots:false` removes only kit-managed items.
8. Observe the stale ordinary item surviving into the new match.

#### Player-visible consequence

Players can carry stale/unintended items across the fresh-session boundary, potentially affecting combat, progression, economy, or reproducibility.

#### Root cause

The fresh-session inventory reset is an online-player batch action rather than a per-player session invariant. Reconnect does not reconcile whether that player completed the reset boundary.

#### Repair direction

Keep one inventory lifecycle owner. Track/reconcile the fresh-session reset per player and enforce it on reconnect before preload/buy-phase continuation. Do not add a second inventory manager.

## Proven finding 2

### BUG — Reconnect during combat respawn countdown bypasses the death delay

Severity: Major  
Proof: source-proven  
Domain: player-state / multiplayer-session / respawn

#### Issue

Attack keeps combat-death respawn ownership in CombatTracker.pendingRespawns. On reconnect, CombatTracker restores the player to spectator/countdown state, but GameManager independently performs active-session reconnect recovery five ticks later without checking the pending respawn owner.

#### Expected

A reconnecting player with an active pending respawn must remain in spectator/death state until the existing respawn timer finishes.

#### Observed source behavior

CombatTracker detects the pending respawn and restores spectator/countdown state:

~~~text
chunk-Y6V6JTGX.js:4936+
_findPendingRespawn(player.id)
→ _sendPlayerToSpectator(...)
→ show remaining countdown
~~~

The pending respawn remains owned by CombatTracker:

~~~text
chunk-Y6V6JTGX.js:4998+
pendingRespawns.set(playerId, ...)
~~~

GameManager also handles the same initial-spawn reconnect:

~~~text
chunk-Y6V6JTGX.js:5666+
initialSpawn
→ handlePlayerReconnection(...)
~~~

For a locked player in an active session it later restores gameplay without consulting pending-respawn state:

~~~text
chunk-Y6V6JTGX.js:5692+
active session
→ runTimeout(..., 5)
→ survival mode
→ applyPlayerLoadout(...)
→ teleport to gameplay spawn
~~~

CombatTracker is initialized before GameManager, so its correct spectator restoration can be overwritten by the later GameManager recovery path.

#### Reproduction path

1. Start an Attack match.
2. Die and enter the respawn countdown.
3. Disconnect before the countdown expires.
4. Reconnect while pendingRespawns still contains the player.
5. CombatTracker restores spectator/countdown state.
6. About five ticks later GameManager restores survival/loadout/gameplay spawn.
7. Observe the player returning before the original death delay expires.

#### Player-visible consequence

The intended combat death/respawn penalty can be bypassed by reconnecting.

#### Root cause

Reconnect state has two writers. CombatTracker owns the pending death lifecycle, but GameManager reconnect recovery does not defer to that owner.

#### Repair direction

Before active-session reconnect recovery, have GameManager consult the existing CombatTracker pending-respawn state. If a respawn is pending, leave recovery to CombatTracker until it resolves. Do not create a second respawn state owner.

## Checked but not admitted as bugs

### Arena ticking areas

Attack does create and verify its arena-specific ticking areas through `TickingAreaManager.createAndVerifyAreas()`. The Composite missing-ticking-area defect is not present in this selected artifact.

### Reset lifecycle

Level structure loading awaits `ResetMapService.resetMap()` before placing structures. The Composite async-reset/reuse root cause was not reproduced in this source pass.

### Two concurrent arena leases

Attack has an explicit lease queue/messenger and `MAX_CONCURRENT_ARENAS` resource policy. Without a current player-facing contract requiring more concurrent active arenas, this is not admitted as a bug.

## Next action

Attack v1.1.1 source pass is closed for this batch with two independently source-proven Major findings. Keep it as non-canonical audit evidence until explicit approval.

## Deep multi-arena pass — additional runtime obligation

### Ticking-area lease release can temporarily undercount live Minecraft areas

Attack uses the same two-held-lease policy with arena-specific ticking areas and explicit queue feedback. Its release path deletes the logical lease before asynchronous area removal finishes.

A capacity+1 acquisition can therefore begin while the previous arena's Minecraft ticking areas are still being removed. Source proves the ownership window but not the exact command interleaving, so this remains runtime-only rather than a confirmed bug.

Narrow validation:

1. Run two Attack arenas simultaneously.
2. Queue/start a third arena.
3. End one active arena while the second remains active.
4. Allow the third arena to acquire immediately.
5. Verify all required ticking areas are created and the third start does not fail during the prior arena's removal window.


## Client-reported issue re-check — multi-arena capacity

The client reported that only two of six arenas can run simultaneously. The selected v1.1.1 artifact confirms the implementation fact:

- six arena configs / join surfaces exist;
- `MAX_CONCURRENT_ARENAS = 2`;
- each active arena leases three ticking areas;
- a third arena is queued and receives a queue-position message.

This must **not** be dismissed merely because queue code exists. Under the Multi Arena Audit Contract, queueing is mitigation/behavior, not proof that two concurrent arenas is the intended delivered capacity.

Current disposition: resolved below as a source-proven Major DESIGN_MISMATCH. The queue remains mitigation, not counter-proof for the delivered-capacity mismatch.

The client also reported a last-second double ending. That specific issue is **not reproduced** in current source: `endGame(arenaId, "victory")` checks whether the game timer has already expired and converts late victory to timeout before completion handling.

A non-admin selection-stick logger is still initialized in production and reacts to any held `minecraft:stick`; ordinary-player stick reachability remains a separate proof question.


## Proven design mismatch — concurrent arena capacity

### DESIGN_MISMATCH — Six playable arena surfaces expose only two concurrent sessions

Severity: Major  
Proof: source-proven  
Domain: arena-multi-arena / boundary-capacity / player-facing capability

#### Issue

The selected Attack artifact defines and exposes six arena/join surfaces, but runtime admission hard-caps active arena leases at:

```text
MAX_CONCURRENT_ARENAS = 2
```

A third otherwise-ready arena is queued instead of starting concurrently.

#### Expected

When six independent arena surfaces are presented as playable capacity, the delivered concurrent capacity should match those surfaces or the lower capacity must be explicitly part of the authored player-facing capability.

#### Actual

Only two arenas can hold the required runtime lease at once. Arenas 3-6 may exist and accept parties, but cannot all progress as independent simultaneous sessions.

#### Player-visible consequence

The world presents substantially more parallel arena capacity than it can actually deliver. Additional groups must wait even though their own arena is otherwise available.

#### Counter-proof review

The queue and queue-position message mitigate the limitation but do not prove that the six visible arena surfaces were authored to mean only two simultaneous sessions. Under the Multi Arena Audit Contract, an implementation cap or fallback queue cannot define its own intended capacity.

#### Repair direction

Reduce the per-arena runtime resource cost or use another proven simulation-residency strategy so delivered concurrency matches the presented arena capacity. Preserve explicit queue behavior as overflow handling rather than the normal path for visible free arenas.
