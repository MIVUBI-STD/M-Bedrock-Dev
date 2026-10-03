# Real Map Audit — Five Nights at Z Village Level 1 v1.1.0

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive project: `PvP - Five Nights at Z Village / Level 1`
- Drive file: `Five Nights at Z Village v1.1.0.mcworld`
- Drive file ID: `1npTapvqtd_Yyd1gOch6U03SIPzkY-pUK`
- Artifact SHA-256: `6910cb83e6d5866896e29553398b3a889e3942f553f9a0423b365f0799018bf2`
- BP/RP manifest version: `1.1.0`
- Min engine version: `1.21.130`
- Internal level name: `Five Nights at Z Village lvl 1`

## Proven findings

No source-proven gameplay defect was admitted in this pass.

Historical bugs were not copied into this artifact without fresh proof.

## Important checks

### Spawn accounting no longer auto-advances failed spawns

Current `spawnWave()` increments `waveSpawnProgress` only after `spawnZombie()` succeeds.

`spawnZombie()` first verifies the target chunk is loaded. If not loaded, it returns without spawning. The caller then retries that individual spawn after 20 ticks.

This means a failed/unloaded spawn is not silently counted as completed and does not directly create the old premature-wave/auto-win path.

### Runtime ticking coverage

Current gameplay creates one explicit runtime ticking area:

```text
defense_fnazv_bridge_<arena>
→ centered on the Bridge route
→ circle radius 2
```

Wave definitions still use three spawn routes:

- Cave;
- Windmill;
- Bridge.

No second `tickingarea add` owner exists in the selected script for Cave/Windmill.

Because `spawnZombie()` checks chunk availability and retries rather than falsely advancing, this is **not admitted as a source-proven bug**. Actual Cave/Windmill residency depends on target runtime simulation/chunk state and player positions.

## Audit obligation — verify Cave/Windmill chunk residency

Narrow runtime validation:

1. Start a normal defense run with players staying at the intended defense position.
2. Exercise waves that spawn from Cave and Windmill.
3. Capture whether both target spawn chunks remain loaded without a player approaching them.
4. Confirm every configured spawn eventually succeeds without requiring manual player movement.
5. If either route remains unloaded and retries indefinitely, promote as a Blocker wave-progression/chunk-readiness bug.

### Why this remains an obligation

The source proves:

- only Bridge is explicitly kept ticking;
- Cave/Windmill spawns require their chunks to be loaded;
- failed spawns retry indefinitely rather than being counted.

The source does **not** prove the actual target runtime simulation distance/residency for Cave/Windmill, so calling it a current gameplay bug would exceed the proof ceiling.

### Reconnect/loadout

A rejoined tagged arena player is reconciled into the current game state. During a running match the code restores Survival mode, spawnpoint, arena position when needed, and triggers the kit grant if `player_kit < 1`.

No source-proven reconnect-loadout-loss defect was admitted.

### Entity route recovery

Current source includes route-specific stuck detection/recovery, canonical path restoration checks, chunk-loaded guards, and bounded safety teleport. Historical navigation problems therefore require fresh current-runtime proof rather than automatic carry-over.

## Result

Five Nights at Z Village Level 1 v1.1.0: **0 source-proven findings** and **1 narrow chunk-residency Audit Obligation**.

No historical regression entry should be created without later runtime/current-artifact proof.
