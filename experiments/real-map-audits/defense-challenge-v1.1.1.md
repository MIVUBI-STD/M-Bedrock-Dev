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

## Checked but not admitted as bugs

### Six configured arenas vs two concurrent ticking leases

The map defines six arena configs, while `MAX_CONCURRENT_ARENAS = 2`.

This is **not admitted as a bug from source alone** because the selected artifact also implements an explicit ticking-area queue and queue messaging. That makes the concurrency cap look intentionally authored unless a separate current-artifact/player-facing contract proves all six must run simultaneously.

### Spawn retry / wave completion

Entity spawns use bounded retries and wave clearance is reconciled against live tagged hostiles. Spawn failure behavior remains a runtime-risk area, but this source pass did not establish a selected-artifact causal contradiction strong enough to admit a second bug.

### Internal level-name version mismatch

The file/manifest is v1.1.1 while `levelname.txt` still says `Daigon Defense v1.1.0`. This is recorded as metadata mismatch only, not gameplay defect.

## Next action

Continue selected-artifact analysis for additional independently proven defects before promoting this audit into the canonical approved Bug Report V2 / historical regression catalog.
