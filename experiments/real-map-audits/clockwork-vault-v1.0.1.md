# Real Map Audit — The Clockwork Vault v1.0.1

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive file: `The Clockwork Vault v1.0.1.mcworld`
- Drive file ID: `1bET36z9mdi3-GYEdHrbKet5QLPZpMq87`
- Artifact SHA-256: `1802103da030b448c4a91e98eeef6f53d95235abda761b35fc0ab4b8453f7c1d`
- Behavior Pack manifest: `1.0.1`
- Min engine version: `1.21.130`
- Internal level name: `Clockwork v1.0.1`

## Proven findings

**0 source-proven gameplay defects admitted in this pass.**

## Checks completed

### Arena ownership

Clockwork requires exactly six unique arena slots. The Arena Registry assigns one player/session to an available arena and persists `occupied/resetting/available` state.

Reset transitions use:
`beginReset(sessionId, playerId, arenaId)`
before baseline cleanup and release only after reset completion/persistence.

No source-proven stale reset/reuse race was established.

### Disconnect / reconnect

Sessions persist active station, completed stations, gameplay timing and interruption state. A disconnect moves eligible sessions to `interrupted` with a resume window; a valid respawn/rejoin resumes the same session. Expired interruptions end through the current session owner.

Individual station controllers also persist/restore their own state and pause timers on leave where required.

### Developer commands

`clockwork:skip`, restart, direct clue and force-stop are routed through the current developer registry and reject non-developers.

No ordinary-player station skip route was admitted.

### Single-player semantics

Each arena is assigned to one player/session, so party-wide disconnect/completion bugs from cooperative maps are not transferred into Clockwork.

## Audit obligations — not bugs

- Complex cinematic/transition recovery remains worth runtime validation at exact disconnect timing boundaries.
- Entity/animation presentation success is not fully provable statically.

## Result

The Clockwork Vault v1.0.1: **0 source-proven gameplay findings**.

Do not create historical regression entries from this pass.

## Deep multi-arena pass — runtime obligation

### Workshop cinematics share one global ticking-area name across six arenas

Clockwork offsets Workshop cinematic coordinates per arena, but the cinematic ticking-area name remains the same literal:

```text
clockwork_workshop_cinematic
```

Every arena instantiates its own Workshop cinematic controller. Starting a cinematic first removes that name and then recreates it at the current arena's Workshop center; cinematic completion/abort removes the same name again.

Therefore two overlapping Workshop cinematics contend for one Minecraft resource name:

```text
Arena A cinematic starts
→ add clockwork_workshop_cinematic at A

Arena B cinematic starts
→ remove clockwork_workshop_cinematic
→ add same name at B

Arena A completes/aborts
→ remove clockwork_workshop_cinematic
→ B no longer owns its intended area
```

This is a source-proven cross-arena ownership collision, but the selected source alone does not prove a player-visible cinematic failure because actual simulation/chunk residency while the player is present is runtime-sensitive.

Targeted validation only:

1. Run two Clockwork arenas independently.
2. Reach Workshop in both.
3. Overlap both Workshop intro cinematics.
4. Verify both cinematics, Custodian pathing, dialogue/audio, and transition to gameplay complete normally when either cinematic starts or ends.

Do not classify as a gameplay bug until manifestation is proven.
