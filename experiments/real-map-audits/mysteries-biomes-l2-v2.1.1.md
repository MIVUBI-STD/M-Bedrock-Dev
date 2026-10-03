# Real Map Audit — Mysteries of Biomes Level 2 v2.1.1

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive file: `Mysteries of Biomes v2.1.1.mcworld`
- Drive file ID: `1pk4tqSJNY9UkHeSW94PeXaQjGdSTdeIE`
- Artifact SHA-256: `e7dba9f91b1562c84fe6ce8d3229d52ca7229f54fa2c6085c0bde636be4ad247`
- Behavior Pack manifest: `2.1.1`
- Min engine version: `1.21.0`
- Internal level name: `FTB - Cave Explorer v2.1.1`

## Proven findings

**0 source-proven gameplay defects admitted in this pass.**

## Checks completed

### Player progression

Current level progression, checkpoint/stat data and leaderboard state are keyed per player. This pass did not establish a cooperative all-player requirement that is accidentally reduced to the online subset.

### Game-mode enforcement

Non-admin players entering Creative or Spectator are forced back to Adventure, preventing normal gameplay from inheriting unrestricted developer mutation rights.

### Coordinate developer tool

The artifact includes a `daigon:coordinate_wand` and `daigon:location` capture surface, but `capture()` explicitly checks the existing admin owner and rejects non-admin users.

Therefore it is not a player-facing debug-tool mismatch.

### World/entity setup

Arena displays/clue NPCs are reconciled by authored arena tags and current configuration. Duplicate setup entities are removed/reconciled rather than accepted as independent gameplay state.

## Audit obligations — not bugs

- Exact multiplayer timing around shared world entities remains runtime-sensitive.
- Version 2.1.1 is taken from the selected artifact/current map file, not the adjacent raw source ZIP.

## Result

Mysteries of Biomes Level 2 v2.1.1: **0 source-proven gameplay findings**.

Do not create historical regression entries from this pass.
