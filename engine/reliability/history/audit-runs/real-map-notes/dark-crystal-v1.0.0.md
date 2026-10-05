# Real Map Audit — Dark Crystal v1.0.0

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive folder: `PvP - DarkCrystal`
- Drive file: `Dark Crystal v1.0.0.mcworld`
- Drive file ID: `1ELPTLlxFiyLhd0Wv3PHnnXO2PD9VHyJq`
- Artifact SHA-256: `189a4a85e704a03a244d9bf42abf289039198831a1d2d933276a49db05a4d79b`
- BP/RP manifest version: `1.0.0`
- Internal level name: `Dark Crystal v1.0.0`

## Proven findings

No source-proven gameplay defect was admitted in this pass.

## Checks completed

### Six-arena party lifecycle

The selected artifact declares six arena-party slots and keeps arena-specific PvP tags separate. Started parties remain distinguishable by arena ID.

### Death / respawn / leave

Production handlers cover player death, player spawn, dimension change, and player leave. Player leave updates arena-party state and active Dark Crystal round ownership rather than silently leaving a stale participant.

### Ticking setup

World setup declares three ticking areas:

- central lobby;
- west lobby/arena join region;
- east lobby/arena join region.

These areas cover the shared lobby/party-admission ring. Source does not claim six independent gameplay ticking areas, and no current-artifact causal contradiction was established from this design.

### World/game rules

Current source explicitly configures keepInventory, immediate respawn, PvP, night, and other world rules through a retrying world-setup owner.

## Result

Dark Crystal v1.0.0: **0 source-proven gameplay findings** in this pass.

No historical regression entry should be created from this map without additional current-artifact/runtime proof.


## Deep multi-arena pass — isolation counter-proof

The six-arena party/PvP system was rechecked for generic tag and world-player leakage.

Current source:

- resolves online players from the exact party/member ID set before per-party player mutation;
- uses distinct player PvP tags `party_arena_1` through `party_arena_6`;
- derives each player's desired tag from the currently started party containing that player;
- world player reconciliation may scan all online players, but only projects each player's own party-derived PvP tag;
- start cinematic operations receive the explicit `playerIds` of one arena/party;
- player leave updates both party membership and active Dark Crystal round ownership.

No current source path was found where Arena A's normal transition or cleanup writes Arena B's match state.

Result: no additional source-proven cross-arena defect admitted.
