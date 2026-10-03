# Real Map Audit — Build & Decode v1.1.0

Status: selected-artifact source audit evidence  
Authority: selected current Drive artifact only  
Runtime execution: not performed

## Target

- Drive folder: `Build - Build & Decode`
- Drive file: `Build & Decode v1.1.0.mcworld`
- Drive file ID: `1aBAM5Hwu58klnGV1dtZZLffgJATPRmtd`
- Artifact SHA-256: `d83cd5e699dfe2676a540a3cdca2b4797a34c75984cac3142488a1556cff7030`
- BP/RP manifest version: `1.1.0`
- min engine version: `1.26.30`

## Current source-proven findings

None admitted in this bounded source pass.

## High-risk areas checked

### Four-arena isolation

Current source explicitly configures and validates exactly four arenas. Plot/pad overlap is rejected by `validateArenas()`, and membership/admission ownership is checked before movement/knockback.

### Start preparation

`startMatch()` transitions into `preparing`, persists the generation, awaits cleanup, then revalidates actual members/readiness before launching. Late arrivals or changed readiness abort back to forming rather than starting stale membership.

### Reset/reuse

`resetArena()` persists phase `resetting`, preserves recovery intents, recovers online participants before plot cleanup, awaits `clean()`, validates the generation token, then resets the arena state. Reuse is therefore not exposed before cleanup completion.

### Disconnect/reconnect recovery

Active matches use durable recovery intents and offline reservations. Recovery validates arena/match ownership before clearing/restoring player state. Cross-arena recovery records fail closed instead of being silently rebound.

### Inventory recovery

For match recovery, critical effects are performed before deleting the durable recovery intent: adventure mode, ability restoration, full inventory clear, teleport to hub, then recovery record deletion.

## Runtime obligations

These are useful real-runtime tests, not current bugs:

- exercise script reload during `preparing` and `resetting`;
- disconnect/reconnect the builder and last online participant;
- verify plot fill batching under Education API timing;
- verify four arenas can operate without cross-arena block/entity leakage.

## Result

Build & Decode v1.1.0 is recorded as **0 current source-proven gameplay findings** in this pass.
