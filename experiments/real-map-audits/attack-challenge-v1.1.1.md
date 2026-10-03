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
- Internal `levelname.txt`: `Attack Challenge v1.1.0` (metadata mismatch only)

## Proven finding

### BUG — Reconnect during combat respawn countdown bypasses the death delay

Severity: Major  
Proof: source-proven  
Domain: player-state / multiplayer-session / respawn

#### Issue

Attack keeps combat-death respawn ownership in `CombatTracker.pendingRespawns`. A reconnecting player is initially put back into spectator/countdown state by CombatTracker, but GameManager independently restores the same locked-party player to active gameplay five ticks later without checking that pending respawn.

#### Expected

A reconnecting player with an active pending respawn must remain in spectator/death state until the existing respawn timer finishes.

#### Observed source behavior

CombatTracker handles a reconnecting player with a pending respawn:

```text
chunk-Y6V6JTGX.js:4936-4950
_findPendingRespawn(player.id)
→ _sendPlayerToSpectator(...)
→ show remaining countdown
```

Death creates and retains the pending timer:

```text
chunk-Y6V6JTGX.js:4998-5060
pendingRespawns.set(playerId, ...)
```

GameManager separately handles initial-spawn reconnects:

```text
chunk-Y6V6JTGX.js:5666-5669
initialSpawn
→ handlePlayerReconnection(...)
```

For an active session, five ticks later it restores gameplay unconditionally:

```text
chunk-Y6V6JTGX.js:5692-5753
locked party member
→ active session
→ runTimeout(..., 5)
→ survival mode
→ applyPlayerLoadout(...)
→ teleport to gameplay spawn
```

CombatTracker is initialized before GameManager:

```text
chunk-Y6V6JTGX.js:9285-9289
CombatTracker.init()
...
GameManager.init()
```

So CombatTracker's correct spectator recovery is subsequently overwritten by GameManager.

#### Reproduction path

1. Start an Attack match.
2. Die and enter respawn countdown.
3. Disconnect before countdown expiry.
4. Reconnect while `pendingRespawns` still contains the player.
5. CombatTracker restores spectator/countdown state.
6. Roughly five ticks later GameManager restores survival/loadout and gameplay spawn.
7. Player returns early.

#### Player-visible consequence

The intended death/respawn penalty can be bypassed by reconnecting.

#### Root cause

Two owners act on reconnect state. CombatTracker owns pending respawn, but GameManager reconnect recovery does not defer to it.

#### Repair direction

If CombatTracker reports a pending respawn for the player, GameManager must not perform active-session survival/loadout/teleport recovery. Let CombatTracker remain the single owner until the pending respawn resolves.

## Checked but not admitted as bugs

### Arena / ticking lifecycle

Attack has dynamic per-arena ticking leases and `MAX_CONCURRENT_ARENAS = 2`. The selected source also implements queue/lease messaging, so the cap is not a bug without a current-artifact contract requiring more simultaneous sessions.

The Defense async-reset stale-release race is not reproduced in Attack's inspected end/reset path; Attack returns the session to idle and releases the lease synchronously.

### Flag carrier death / disconnect

FlagService explicitly handles carrier death/respawn/disconnect and re-spawns dropped flag state. No source-proven carrier-disconnect progression defect was admitted.

### Level advance setup timing

Level advance setup remains a narrow validation obligation rather than a proven bug. Structure setup is asynchronous while transition timing is fixed; source does not prove the setup exceeds the transition window in the target runtime.

## Result

Attack Challenge v1.1.1 currently has:

- **1 source-proven gameplay bug**
- **1 narrow runtime validation obligation**
- metadata version mismatch recorded but not admitted as gameplay defect

Do not ingest historical regression data until approval.
