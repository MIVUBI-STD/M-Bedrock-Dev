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
