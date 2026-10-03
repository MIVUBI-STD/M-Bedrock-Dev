# Real Map Audit — Fall of the Pillager Level 2 v2.2.2

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive project: `PvP - Fall of the Pillager / Level 2`
- Drive file: `Fall of the Pillager Level 2 v2.2.2.mcworld`
- Drive file ID: `1m9JnjTHqUP39OWQVpmWGpmetUTx6Vqaa`
- Artifact SHA-256: `9b66dab3550d45a2e1b16aebaaabca85676e969179e2a2f3f557f973abe43889`
- BP/RP manifest version: `2.2.2`
- Min engine version: `1.21.130`
- Internal level name: `Fall of the Pillager 2 v2.1.0`

The internal level name is stale metadata only; both pack manifests consistently identify the current artifact as v2.2.2.

## Proven findings

No source-proven gameplay defect was admitted in this pass.

## Important checks

### Active session persistence / reload

Current source persists active stages, wave jobs, current wave, elapsed game ticks, objective state, and session phase. Reload recovery reconciles persisted wave requests instead of blindly replaying already-finished work.

### Flag carrier

Current objective manager keeps a single deterministic flag carrier ID and reconciles carrier availability. Missing/dead/out-of-dimension carrier state returns the flag to the castle and reopens the capture objective.

No stale-carrier progression defect was admitted.

### Entity movement recovery

Current gameplay tracks arena-managed entities and periodically restores stage-specific movement/navigation behavior for entities that load/reload without their movement setup. The source also preserves pending wave/job state across interruptions.

Historical bridge/pathing failures therefore require fresh runtime proof rather than automatic carry-over.

### World/player safety

Current world rules explicitly disable PvP and configure immediate respawn. Non-admin players are forced out of Creative/Spectator outside loading ownership, and build/break interactions are permission controlled.

### Temporary debug-stick import

The production entry imports `./dev/debug-stick.js`, whose coordinate picker itself has no admin gate.

Unlike Build & Decode, this artifact does **not** expose a normal gameplay source of `minecraft:stick` to non-admin players:

- current kits contain swords/axe, shield, bow, food, apples, arrows, potions;
- current shop has food, apples, TNT barrel, potions, arrows;
- non-admin players are forced to Adventure.

Therefore the imported debug tool is not admitted as a player-reachable current gameplay finding from source alone. It remains source hygiene/developer-tool residue only.

## Result

Fall of the Pillager Level 2 v2.2.2: **0 source-proven gameplay findings** in this pass.

No historical regression entry should be created without later current-artifact/runtime proof.
