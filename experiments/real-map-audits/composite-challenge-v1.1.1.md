# Real Map Audit — Composite Challenge v1.1.1

Status: source-proven real-map audit evidence  
Authority: selected current Drive artifact only  
Historical regression ingestion: not yet approved  
Runtime execution: not performed

## Target

- Drive folder: `Challenge - Composite Map`
- Drive file: `Composite Challenge v1.1.1.mcworld`
- Drive file ID: `1hFF8MaIgsVFBXgh_ll6f2Uoo2Cv3Y_Rr`
- Artifact SHA-256: `c7a208ccb943d214de6bb6d2f15f265f8dba2b794ae56da40a11bef24162776a`
- Behavior Pack manifest version: `1.1.1`
- Behavior Pack min engine version: `1.21.130`

## Proven finding

### BUG — Arena can restart while asynchronous block reset is still mutating the same arena

Severity: Blocker  
Proof: source-proven  
Domain: game-flow / multiplayer-session / world-interaction

#### Issue

Composite starts the arena block reset asynchronously and does not await or gate on its completion. The session is then persisted as `idle`, while the reset continues chunk-by-chunk over later ticks. Start validation checks only party membership/readiness and therefore allows a fresh run to begin while the previous reset is still modifying the arena.

#### Expected

An arena must remain unavailable for a new match until its previous block reset completes, or start admission must explicitly fail while `ResetMapService` reports that arena as resetting.

#### Observed source behavior

1. Reset is asynchronous and multi-tick:

```text
behavior_packs/BP/scripts/chunks/chunk-2GRFUQFH.js:7881-7921
resetMap(...)
→ generateChunks(...)
→ processChunksOverTime(...)
```

```text
behavior_packs/BP/scripts/chunks/chunk-2GRFUQFH.js:7951+
process only chunksPerTick
→ continue across later ticks
```

2. Normal game end fires reset without awaiting it, then immediately exposes the arena as idle:

```text
behavior_packs/BP/scripts/chunks/chunk-2GRFUQFH.js:15369-15380
resetArenaPlacedBlocks(arenaId, reason)
...
saveSession(... status: "idle")
```

3. Admin reset has the same ordering:

```text
behavior_packs/BP/scripts/chunks/chunk-2GRFUQFH.js:15994-16032
resetArenaPlacedBlocks(...)
...
saveSession(... status: "idle")

resetArenaPlacedBlocks(...)
→ void ResetMapService.resetMap(...)
```

4. `validateStart()` checks party size/readiness only. It does not check `ResetMapService.resetStateByArena` / reset-in-progress state:

```text
behavior_packs/BP/scripts/chunks/chunk-2GRFUQFH.js:13756-13782
```

5. `startGame()` accepts the now-idle arena immediately after that validation and enters countdown:

```text
behavior_packs/BP/scripts/chunks/chunk-2GRFUQFH.js:13784-13812
```

#### Reproduction path

1. Run a Composite arena normally.
2. End the match or invoke the game reset path.
3. Immediately ready a valid party for the same arena before the map reset finishes.
4. Start/auto-start the same arena.
5. The new countdown/session begins while `ResetMapService.processChunksOverTime()` is still clearing/recovering blocks in that arena.
6. Observe fresh player-built or gameplay-relevant blocks being removed/recovered by the previous run's reset.

#### Player-visible consequence

The new run can begin on a map that is still being mutated by stale cleanup. Fresh placements or world state can disappear during countdown/buy/gameplay, producing corrupted setup/progression and an unreliable arena baseline.

#### Root cause

Arena reuse is controlled by persisted session status, while map reset ownership lives separately in `ResetMapService`. The reset is fire-and-forget and start admission does not reconcile those two owners.

#### Repair direction

Do not add another global manager. Use one of:

- await reset completion before writing/exposing the reusable idle state; or
- make `validateStart()`/start admission reject an arena while `ResetMapService` reports reset-in-progress.

The preferred invariant is: **arena reusable ⇒ previous world reset complete**.

## Checked but not admitted as bugs

### Ticking areas

Composite's setup layer creates lobby/permission ticking areas only; it does not use Defense's per-arena ticking lease manager. The Defense lease-release bug was therefore not copied into Composite.

### Historical/source documents

Drive changelog/guide/Technical Docs were not used as current gameplay authority.

## Next action

Composite v1.1.1 source pass has one independently source-proven blocker pending approval. Do not ingest it into the historical regression catalog until the approval boundary is crossed.
