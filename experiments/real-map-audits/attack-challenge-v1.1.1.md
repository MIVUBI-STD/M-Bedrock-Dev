# Real Map Audit — Attack Challenge v1.1.1

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive folder: `Challenge - Attack Map`
- Drive file: `Attack Challenge v1.1.1.mcworld`
- Drive file ID: `14JStk_EK0XlAyBTdPLyUE2lCKyk9BKpX`
- Artifact SHA-256: `95bf318070b3948f0a0d1d093bae2f7b1a3a37e4d94e94d2adfc4d80a501ccba`
- Behavior Pack manifest version: `1.1.1`
- Behavior Pack min engine version: `1.21.130`

## Proven findings

No additional source-proven gameplay defect was admitted in this pass.

This is intentional. Historical Defense/Composite defects were not copied into Attack without current-artifact proof.

## Source checks completed

### Arena / ticking lifecycle

Attack has a per-arena `TickingAreaManager` and `MAX_CONCURRENT_ARENAS = 2`, but final `endGame()` returns the session to idle and releases the lease directly without starting the asynchronous block-reset flow used by Defense.

The Defense stale-reset lease-release race was therefore **not reproduced in Attack source**.

### Flag carrier death / disconnect

`FlagService` explicitly handles:

- player death;
- respawn;
- player disconnect.

A disconnected carrier triggers `handleCarrierDeath()`, clears carrier state, respawns the red flag, broadcasts the drop, and invokes the registered flag-drop callback.

No carrier-disconnect progression defect was admitted.

### Reconnect lifecycle

GameManager registers initial-spawn reconnection recovery and looks up locked parties before restoring a player into a non-idle/non-countdown arena.

No source-proven reconnect-loss defect was admitted in this pass.

## Audit obligation — level advance setup is timer-gated rather than Promise-gated

This is **not admitted as a gameplay bug yet**.

On level advance:

```text
tick +10:
void StructureLoader.setupLevel(nextLevel, ..., {spawnEntities:false})

tick +90:
startBuyPhase(nextLevel)
```

Relevant source:

- `behavior_packs/BP/scripts/chunks/chunk-Y6V6JTGX.js:7990-8030`
- `TRANSITION_FADE_IN_WAIT = 10`
- `TRANSITION_FADE_CLEAR_WAIT = 90`

`StructureLoader.setupLevel()` awaits:

1. `ResetMapService.resetMap()`;
2. each configured structure load.

The normal reset config estimates ~80 reset chunks processed 5 per tick (~16 ticks), so source alone does not prove setup exceeds the 80-tick gap. Therefore the race remains a narrow validation obligation rather than a bug.

### Narrow validation

During an advance between levels:

1. capture when `StructureLoader.setupLevel()` resolves;
2. capture when `startBuyPhase()` begins;
3. repeat under the actual target runtime/server load;
4. if buy phase begins before setup completes, promote as a progression/world-state bug.

## Result

Attack Challenge v1.1.1 has **0 source-proven findings** in this pass and **1 narrow runtime validation obligation**.

Do not create a historical regression entry from this map unless a later proof step establishes a causal defect.
