# Real Map Audit — Composite Challenge v1.1.1

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive folder: `Challenge - Composite Map`
- Drive file: `Composite Challenge v1.1.1.mcworld`
- Drive file ID: `1hFF8MaIgsVFBXgh_ll6f2Uoo2Cv3Y_Rr`
- Artifact SHA-256: `c7a208ccb943d214de6bb6d2f15f265f8dba2b794ae56da40a11bef24162776a`
- Behavior Pack manifest version: `1.1.1`
- Behavior Pack min engine version: `1.21.130`

## Proven findings

**No source-proven gameplay defect is admitted in this pass.**

This result is intentional. Composite embeds Attack/Defense systems, but issues from those maps were not copied into Composite unless the Composite-managed current path reproduced the same causal chain.

## False-positive removed — asynchronous reset vs arena reuse

A previous source pass treated Composite reset/reuse as a Blocker because `resetPlacedBlocks()` launches an async reset and the session becomes idle immediately.

That conclusion is not supported after calculating the selected artifact's actual reset workload.

### Current reset workload

`resetConfig.area` is:

```text
x: -66 .. 82
y: -60 .. -27
z: -203 .. -41
chunkSize: 32
chunksPerTick: 5
```

This produces:

```text
X chunks = 5
Y chunks = 2
Z chunks = 6
total    = 60 chunks
```

At 5 chunks per tick, the configured reset is scheduled over approximately:

```text
60 / 5 = 12 ticks
```

Relevant source:

```text
chunk-2GRFUQFH.js:7827-7835
reset bounds / chunkSize / chunksPerTick
```

```text
chunk-2GRFUQFH.js:7923-7949
generateChunks(...)
```

```text
chunk-2GRFUQFH.js:7951-7985
processChunksOverTime(...)
→ at most 5 chunks each tick
```

Composite does expose the session as reusable before the reset Promise is awaited:

```text
chunk-2GRFUQFH.js:28300-28305
resetPlacedBlocks(...)
CompositeSessionService.reset(...)
recentCompositeResetUntilByArena = now + AUTO_START_RESET_COOLDOWN_TICKS
```

However the same selected artifact applies a **5-second / 100-tick auto-start reset cooldown** before reuse. With the configured 60-chunk reset, source does not establish an overlap.

Therefore the old reset-overlap finding is removed rather than retained as a speculative bug.

## Checked current Composite paths

### Composite reload/recovery

Composite has a dedicated recovery owner:

```text
CompositeRecoveryService
→ recover countdown / preload / prepare / gameplay / level-complete
→ restore Attack snapshot
→ restore Defense snapshot
→ restore timed-wave snapshot
```

Relevant source:

```text
chunk-2GRFUQFH.js:25811-26060
```

Active gameplay recovery restores both module snapshots and resumes timed waves only after preload/recovery completes. No current source contradiction was established.

### Respawn/reconnect ownership

Composite has explicit spectator recovery that checks pending respawn end ticks from both CombatTracker implementations before recovering a player from the spectator area:

```text
chunk-2GRFUQFH.js:29093-29105
hasActivePendingRespawn(...)
shouldRecoverStuckSpectator(...)
```

```text
chunk-2GRFUQFH.js:29171-29191
get pending respawn end tick from Defense + Attack trackers
→ do not recover while pending respawn is active
```

The reconnect exploit proven in standalone Defense/Attack was therefore not automatically copied into the Composite-managed runtime.

### Delayed spawn retry

The WaveScheduler supports `delaySeconds`, but the selected Composite level configuration does not currently define delayed spawn entries. The generic branch is not sufficient evidence of a current gameplay defect.

## Audit obligations — not bugs

### Terminal event ordering

Composite treats:

```text
ATTACK_FLAG_DELIVERED
→ level complete

DEFENSE_FLAG_BREACHED / team wipe
→ level fail
```

If opposing terminal events occur effectively together, outcome ordering depends on event delivery. The selected source does not define a separate simultaneous-terminal precedence rule.

This remains a narrow runtime validation obligation, not a source-proven bug.

### Entity spawn retries

EntityLoader can retry failed spawns for a long bounded period. Current Composite configuration does not establish the same delayed-group causal chain proven in standalone Defense. Keep retry behavior under targeted validation rather than promoting it from historical similarity.

## Result

Composite Challenge v1.1.1 currently has:

- **0 source-proven gameplay bugs**
- **2 narrow validation obligations**
- **1 previous false-positive finding removed after bounded current-artifact proof**

Do not create historical regression entries for this map from this pass.
