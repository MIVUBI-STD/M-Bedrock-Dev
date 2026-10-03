# Real Map Audit — Defense Challenge v1.1.1

Status: source-proven real-map audit evidence  
Authority: selected current Drive artifact only  
Historical regression ingestion: not yet approved  
Runtime execution: not performed

## Target

- Drive folder: `Challenge - Defense Map`
- Drive file: `Defense Challenge v1.1.1.mcworld`
- Drive file ID: `1Y7G96SRBgSkfhlpnm8xFV3VpmzluvWh-`
- Artifact SHA-256: `edb6fa56834279210f85de15637c4a980b9e6e9eafce93bcde5fd1ade9c729ee`
- Behavior Pack manifest version: `1.1.1`
- Behavior Pack min engine version: `1.21.130`
- Internal `levelname.txt`: `Daigon Defense v1.1.0` (metadata mismatch only; not admitted as gameplay bug)

## Proven finding

### BUG — Arena reset can release the ticking-area lease of a newly started run

Severity: Blocker  
Proof: source-proven  
Domain: multiplayer-session / chunks / arena lifecycle

#### Issue

A completed/aborted/admin-reset match exposes the arena as reusable before the asynchronous map reset finishes. A new run can acquire the still-held ticking-area lease, then the previous reset completion releases that same lease and removes the ticking areas underneath the new run.

#### Expected

An arena must not become startable/reusable until its asynchronous reset has completed, or ticking-area leases must be generation-bound so cleanup from an earlier run cannot release a newer run's lease.

#### Observed source behavior

1. The ticking-area manager treats an already-held arena lease as an immediate successful acquire:

```text
behavior_packs/BP/scripts/chunks/chunk-ZDK4WOHG.js:1876-1879
acquire(arenaId)
→ if heldLeases.has(arenaId)
→ Promise.resolve(true)
```

2. Normal end/reset begins an asynchronous map reset, then immediately persists a default `idle` session before reset completion:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:13303-13315
mapResetPromise = resetArenaPlacedBlocks(...)
saveSession(... status: "idle")
mapResetPromise.finally(() => TickingAreaManager.release(arenaId))
```

Admin reset has the same ordering:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:14121-14133
mapResetPromise = resetArenaPlacedBlocks(...)
saveSession(... status: "idle")
mapResetPromise.finally(() => TickingAreaManager.release(arenaId))
```

3. Auto-start explicitly considers any `idle` arena eligible for a fresh start:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:13505-13516
if session.status === "idle"
→ validateStart()
→ startGame()
```

4. `startGame()` then calls `TickingAreaManager.acquire(arenaId)`. Because the previous run still holds the lease during reset, acquire resolves `true` immediately. Fresh validation passes and countdown begins:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:11554-11577
pendingLeaseArenas.add(arenaId)
TickingAreaManager.acquire(arenaId)
→ validateStart()
→ beginCountdown()
```

5. The reset is materially asynchronous. It splits the reset volume into chunks and continues work over later ticks:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:4920-4951
generateChunks(...)
processChunksOverTime(...)
```

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:4982-5024
process at most chunksPerTick
→ system.run(...)
→ continue next tick
```

6. When the old reset promise finally resolves, `release(arenaId)` removes the held lease by arena ID with no run/generation token:

```text
behavior_packs/BP/scripts/chunks/chunk-ZDK4WOHG.js:1895-1900
heldLeases.delete(arenaId)
removeAreas(...)
```

#### Reproduction path

1. Start an arena normally.
2. End/reset the match so `resetArenaPlacedBlocks()` begins.
3. Before map reset finishes, make a valid party ready for the same arena.
4. Auto-start or manually start that arena again.
5. The new run starts while the old reset still owns the same lease.
6. When the old reset finishes, its `finally()` calls `release(arenaId)`.
7. The new run loses its ticking areas during countdown/preload/gameplay.

#### Player-visible consequence

The new session can continue after its simulation/ticking areas are removed, which can break entity spawning, pathing, wave progression, and other arena systems that depend on the configured ticking areas.

#### Root cause

Lease ownership is keyed only by `arenaId`, while arena reuse is exposed before asynchronous reset completion. There is no run/reset generation token binding a release to the lease instance it originally owned.

#### Repair direction

Use one of these equivalent ownership fixes:

- keep the arena non-reusable until the map reset promise settles; or
- issue a lease generation/token on acquire and require the same token on release.

Do not fix this by adding another global state owner. Reset completion/reuse and lease ownership should remain within the existing arena/session + ticking-area lifecycle.

## Additional proven findings

### BUG — Reconnect during combat respawn countdown bypasses the death delay

Severity: Major  
Proof: source-proven  
Domain: player-state / multiplayer-session / respawn

#### Issue

A player who disconnects while a combat respawn is pending remains in the locked party. On reconnect, CombatTracker correctly detects the pending respawn and returns the player to spectator state, but GameManager's independent reconnect handler runs five ticks later and restores survival mode, loadout, and gameplay spawn without checking the pending respawn state.

#### Expected

A reconnecting player with an active pending respawn must remain in spectator/death state until the existing respawn timer expires.

#### Observed source behavior

CombatTracker is initialized before GameManager, so both subscribe to player spawn events:

```text
ctf-defense-MJPEJYBR.js:15292-15299
CombatTracker.init()
...
GameManager.init()
```

CombatTracker detects pending respawn and keeps the reconnecting player in spectator:

```text
ctf-defense-MJPEJYBR.js:2866-2879
_findPendingRespawn(player.id)
→ _sendPlayerToSpectator(...)
→ show remaining respawn countdown
→ return
```

The pending respawn timer stays alive while the player is offline and is not cleared by GameManager's player-leave handler:

```text
ctf-defense-MJPEJYBR.js:2940-3004
pendingRespawns.set(playerId, ...)
timer remains until its scheduled end
```

```text
ctf-defense-MJPEJYBR.js:10622-10635
handlePlayerLeave()
→ clears warning/location/vote bookkeeping only
```

GameManager separately handles the same reconnect and, five ticks later, restores active gameplay without checking `CombatTracker.hasPendingRespawn` / pending state:

```text
ctf-defense-MJPEJYBR.js:10540-10620
locked party member + active session
→ runTimeout(..., 5)
→ survival mode
→ applyPlayerLoadout(...)
→ teleport to gameplay spawn
```

#### Reproduction path

1. Enter an active Defense match.
2. Die and enter the configured respawn countdown.
3. Disconnect before the countdown expires.
4. Reconnect while the pending respawn timer still exists.
5. CombatTracker initially restores spectator/countdown state.
6. About five ticks later GameManager restores survival/loadout/gameplay spawn.
7. Player resumes gameplay before the original death delay has elapsed.

#### Player-visible consequence

Players can bypass the intended combat death penalty by reconnecting during the respawn countdown.

#### Root cause

Respawn ownership is split between CombatTracker pending-respawn state and GameManager reconnect recovery. The reconnect path does not defer to the existing pending-respawn owner.

#### Repair direction

Before active-session reconnect recovery, ask CombatTracker whether the player has a pending respawn. If yes, leave recovery to CombatTracker and do not independently restore survival/loadout/teleport.

---

### BUG — Failed delayed wave spawns can be treated as cleared before spawn retries finish

Severity: Blocker  
Proof: source-proven  
Domain: game-flow / entity-behavior / chunks

#### Issue

For delayed spawn groups, the scheduler decrements its pending-group count immediately after the first spawn attempt, then calls hostile-clearance reconciliation using the **requested** entity count. If all entities fail the first attempt because their spawn chunk is not ready, EntityLoader schedules retries, but there are still zero live tagged hostiles. Reconciliation can therefore fire "all hostiles killed" before the retry queue has spawned anything.

#### Current-artifact applicability

Defense Level 15, Wave 3 contains a real delayed group:

```text
chunk-WL4PNCET.js:1792-1805
east/west late-game entities use delaySeconds: 10
```

So this is not a dead generic branch.

#### Expected

A wave cannot be considered cleared while configured entity spawns are still pending retry.

#### Observed source behavior

Spawn failure schedules retries and still returns the full requested count:

```text
ctf-defense-MJPEJYBR.js:254-289
spawnLevelEntities(...)
→ failed entities added to retrying
→ scheduleSpawnRetries(...)
→ return { requested: entities.length, spawned, retrying }
```

The retry chain may continue for up to 150 attempts:

```text
ctf-defense-MJPEJYBR.js:406-447
scheduleSpawnRetries(...)
```

For a delayed group, WaveScheduler performs only the initial attempt, then immediately removes the group from `pendingSpawnGroups`, sets CombatTracker with `result.requested`, and reconciles live hostiles:

```text
ctf-defense-MJPEJYBR.js:3835-3852
_spawnGroup(...)
pendingSpawnGroups--
prepareForNextWave(arenaId, result.requested)
reconcileHostileClearance(...)
```

CombatTracker interprets zero live tagged hostiles as cleared whenever `spawnedThisWave > 0`:

```text
ctf-defense-MJPEJYBR.js:3090-3103
if spawnedThisWave > 0
and dimension.getEntities(tags...).length === 0
→ _allHostilesKilledCallback(arenaId)
```

WaveScheduler's completion gate only knows about scheduled delayed-group timers, not EntityLoader's retry queue:

```text
ctf-defense-MJPEJYBR.js:3663-3681
pendingSpawnGroups === 0
+ allWavesLaunched
→ mark wave cleared
→ cleanup
→ level complete
```

#### Reproduction path

1. Reach Level 15 Wave 3.
2. Allow the 10-second delayed east/west group to fire while its target spawn chunk/location is not ready.
3. Initial spawn attempt returns `spawned = 0`, `retrying > 0`, `requested > 0`.
4. Scheduler decrements the delayed pending-group count.
5. Reconciliation sees zero live hostiles and fires all-hostiles-killed.
6. The wave/level can advance while EntityLoader retries are still pending.

#### Player-visible consequence

Configured enemies may be skipped and late-game progression can advance prematurely, including early level completion/victory depending on which delayed group fails.

#### Root cause

There are two asynchronous spawn states with separate ownership:

- WaveScheduler tracks delayed group timers.
- EntityLoader tracks retrying entity configs.

Wave completion only waits for the first owner.

#### Repair direction

Expose retry-pending count/generation from EntityLoader to WaveScheduler/CombatTracker, or make a spawn group remain pending until every requested entity is either successfully spawned or explicitly resolved as a terminal spawn failure. Do not infer clearance from live-entity count while retries are outstanding.


## Audit obligation — Shop command-delivery transaction is not atomic

The Speed Potion path consumes coins before `runCommandAsync("give @s potion 1 14")` confirms delivery. The catch path does not refund coins.

This is **not admitted as a current gameplay bug** because the selected command is valid in current Bedrock semantics and this source pass has not established a normal selected-artifact trigger that makes that command fail. Keep it as transaction-hardening / failure-path validation only.

## Proven finding 2

### BUG — Disconnect during preload can bypass the full inventory wipe and carry stale items into the new match

Severity: Major  
Proof: source-proven  
Domain: player-state / inventory / reconnect lifecycle

#### Issue

The initial preload intentionally clears every online arena player's entire inventory. A player who disconnects before that wipe and reconnects after it has already run is not included in the clear. The reconnect handler for `preloading` only restores gameplay state/teleport and does not perform the missed full inventory clear. When buy phase starts, the loadout refresh runs with `clearAllSlots: false`, so inventory outside the managed loadout slots survives into the new match.

#### Expected

Every player entering a fresh Defense session must pass the same full inventory-reset boundary regardless of disconnect/reconnect timing.

#### Observed source behavior

1. Preload performs the full inventory wipe only for players currently online in the arena:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:11752-11756
teleportArenaPlayers(...)
clearArenaPlayerItems(arenaId)
```

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:11828-11840
clearArenaPlayerItems()
→ getArenaOnlinePlayers(arenaId)
→ clearPlayerItems(...)
→ runCommandAsync("clear @s")
```

2. Reconnect during `preloading` does not replay the missed inventory wipe and does not apply a full-clear loadout:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:10608-10619
if session.status === "preloading"
→ configure gameplay state
→ teleport
→ no clear @s
→ no clearAllInventoryForLoadout()
```

3. When buy phase starts, the arena loadout refresh explicitly uses `clearAllSlots: false`:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:12617-12624
recoverArenaPlayersToGameplaySpawns(...)
KitManager.applyArenaLoadouts(... {
  clearAllSlots: false,
  preservePersistentShopItems: true
})
```

4. With `clearAllSlots: false`, `applyPlayerLoadout()` only clears managed loadout slots:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:1881-1908
if clearAllSlots
  clearAllInventoryForLoadout()
else
  clearManagedLoadoutSlots(...)
```

5. Managed chest-slot mapping can only address inventory slots 0–9 (plus explicit equipment slots), leaving normal inventory slots 10–35 outside the loadout cleanup surface:

```text
behavior_packs/BP/scripts/chunks/ctf-defense-MJPEJYBR.js:1697-1707
equipment chest slots: 0,1,2,3,10
9..17 → inventory 0..8
18..26 → inventory 1..9
other chest slots remain chestSlot
```

Therefore stale/non-session items held in inventory slots 10–35 can survive the missed preload wipe and remain after buy-phase loadout application.

#### Reproduction path

1. Join a valid party/arena and place a recognizable item in inventory slot 10–35.
2. Start the match countdown.
3. Disconnect before the preload callback reaches `clearArenaPlayerItems()`.
4. Reconnect after that wipe has already executed while the session is still `preloading`.
5. The reconnect handler teleports the player back but does not clear inventory.
6. Allow preload to finish and enter buy phase.
7. The loadout refresh runs with `clearAllSlots: false`.
8. Observe the old item still present in slot 10–35.

#### Player-visible consequence

Players can carry stale or unintended items across the fresh-session inventory reset boundary. Depending on the item, this can affect progression, economy, combat balance, or test reproducibility.

#### Root cause

Inventory reset is applied to the set of players online at one preload tick instead of being represented as a per-player session invariant. Reconnect during `preloading` does not reconcile whether that player has completed the new-session inventory reset.

#### Repair direction

Keep one reset owner. Record/reset the per-player new-session inventory boundary and reconcile it on reconnect before teleport/loadout continuation, or run the same full inventory reset for reconnecting preload players before they can enter buy phase.

Do not add a second inventory lifecycle manager.

## Checked but not admitted as bugs

### Six configured arenas vs two concurrent ticking leases

The map defines six arena configs, while `MAX_CONCURRENT_ARENAS = 2`.

This is **not admitted as a bug from source alone** because the selected artifact also implements an explicit ticking-area queue and queue messaging. That makes the concurrency cap look intentionally authored unless a separate current-artifact/player-facing contract proves all six must run simultaneously.

### Spawn retry / wave completion

Entity spawns use bounded retries and wave clearance is reconciled against live tagged hostiles. Spawn failure behavior remains a runtime-risk area, but this source pass did not establish a selected-artifact causal contradiction strong enough to admit a second bug.

### Internal level-name version mismatch

The file/manifest is v1.1.1 while `levelname.txt` still says `Daigon Defense v1.1.0`. This is recorded as metadata mismatch only, not gameplay defect.

## Audit obligation — Speed Potion purchase delivery is non-atomic

This is **not admitted as a gameplay bug yet** because the selected source proves the failure consequence but does not prove that the configured command fails on the target runtime.

Current source:

```text
Shop item:
giveCommand = "give @s potion 1 14"
price = 12
```

Purchase ordering:

```text
consumeCoins()
→ notify purchase
→ runCommandAsync(giveCommand)
→ on command error: show failure message only
→ no refund
→ generic "Purchased ..." success message still executes
```

Relevant source:

- `behavior_packs/BP/scripts/chunks/chunk-ZDK4WOHG.js:69-77`
- `behavior_packs/BP/scripts/chunks/chunk-ZDK4WOHG.js:1750-1799`

Narrow validation:

1. Enter an active shop phase with at least 12 coins.
2. Buy **Speed Potion**.
3. Verify whether `give @s potion 1 14` succeeds on the actual target runtime.
4. If command delivery fails, confirm that 12 coins were consumed and the later success message is still shown.

If runtime confirms command failure, promote as a Major economy transaction bug. Until then it remains an Audit Obligation.

## Next action

Defense v1.1.1 source pass is complete for this real-test round. Keep the proven reset/lease race pending approval and the Speed Potion transaction as a narrow runtime obligation. Do not ingest either into historical reliability knowledge until the approval boundary is crossed.
