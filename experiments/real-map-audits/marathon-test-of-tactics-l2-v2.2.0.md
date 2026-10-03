# Real Map Audit — Marathon Test of Tactics Level 2 v2.2.0

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive project: `Minigame - Marathon Test of Tactics / Level 2`
- Drive file: `Marathon Test of Tactics v2.2.0.mcworld`
- Drive file ID: `1WyB9P4kjirf-ft34Fcq2q6jR4wRkjqX8`
- Artifact SHA-256: `163b85be6d350fe9ea3cb1dce553c046593375f7c901392cb83a29f8c5b77482`
- BP/RP manifest version: `2.2.0`
- Min engine version: `1.21.90`

## Proven findings

No source-proven gameplay defect was admitted in this pass.

## Important checks

### Generation-bound reset ownership

Sessions and arenas carry a generation value. Reconnect validation, arena ownership, reset, cleanup, and orphan recovery compare both session ID and generation before accepting ownership.

This prevents the stale-cleanup ownership bug found in Defense.

### Reset ticking-area scope

`ResetCoordinator.reset()` derives its ticking area from the mode-specific resolved arena definition, not the entire 469-block-wide arena slot.

Examples:

- TNT Run reset bounds are roughly 55×60 blocks, yielding radius 2.
- Bridge reset bounds are roughly 110×50 blocks, yielding the capped radius 4.

The reset commands and load probes are generated from those same mode definitions. Source therefore does not support a claim that reset chunks are centered on the wrong gameplay region.

### Active disconnect

`handleActiveDisconnect()` explicitly removes the participant from the active session and recalculates terminal state:

- all active players gone → abort;
- TNT Run/Sumo/TNT Tag one player left → winner;
- Bridge/Duels one team left → team winner;
- tagged TNT player disconnect → tag ownership is reassigned.

Reconnect policy refuses to resume a player whose membership no longer exists and routes them through cleanup/selection-lobby recovery. This is internally consistent forfeiture behavior.

### Reload recovery

World reload does not pretend an incompletely snapshotted match can safely resume. Existing sessions are failed and routed through verified cleanup, while orphan arenas use generation-bound reset recovery.

## Result

Marathon Test of Tactics Level 2 v2.2.0: **0 source-proven gameplay findings** in this pass.

No historical regression entry should be created without later current-artifact/runtime proof.
