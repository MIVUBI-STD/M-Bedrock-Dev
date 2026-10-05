# Real Map Audit — Orb of the Illusioner Level 1 v1.2.1

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive file: `Orb of the Illusioner Level 1 v1.2.1.mcworld`
- Drive file ID: `1hU8Mvg8Ty1uB2C-MlDjaon-YqEf3Rffo`
- Artifact SHA-256: `7557e129a7cc148d1a610fac7a65f90a240debdcca7fbec989414f9c43274444`
- BP/RP manifest version: `1.2.1`
- Internal level name: `Orb of the Illusioner Level 1 v1.2.1`

## Proven findings

**0 source-proven gameplay defects admitted in this pass.**

## Checks completed

### Arena/session isolation

The selected artifact builds arena-scoped contexts, transforms commands/selectors into arena scope, and persists session snapshots. Delayed work is attached to the current arena/run rather than a single global gameplay owner.

### Disconnect / reconnect

Started-party disconnects use an explicit recovery window. Session/run state is separately persisted and reconnect restoration resolves against current arena assignment/state rather than reconstructing from another map/version.

No current source contradiction was established where an offline member silently completes a required objective or receives a stale session from another arena.

### Loading / reset / cleanup

Arena loading is persistent/retryable and protects player controls while preparation is incomplete. Finalization uses a saved journal and cleanup state so reload during cleanup does not silently reuse unfinished arena state.

### Developer operations

Developer/admin operations are separated from normal gameplay surfaces. No player-reachable progression skip was proven in this pass.

## Audit obligations — not bugs

- Runtime-only navigation/entity behavior remains outside static proof.
- Disconnect timing around objective boundaries can be included in runtime validation, but no source-proven bypass was admitted.

## Result

Orb of the Illusioner Level 1 v1.2.1: **0 source-proven gameplay findings**.

Do not create historical regression entries from this pass.


## Deep multi-arena pass — context-proxy counter-proof

Orb L1 generates six arena instances. Several legacy manager methods appear world-global when read in isolation, including calls such as `world.getPlayers()` / `getAllPlayers()`.

The selected artifact's scoped server context is the blocking counter-proof:

- gameplay construction runs inside the current arena context;
- scoped `world.getAllPlayers()` returns only current arena/session players;
- scoped dimensions filter player queries to the current arena;
- entity queries/spawns are bound to current arena ownership;
- scheduled gameplay work executes with the same arena context;
- persisted session/recovery state remains bound to the current arena/run.

This prevents the apparent Knockdown/revive/global-player patterns from becoming cross-arena operations.

Result of this multi-arena pass: **no additional source-proven cross-arena defect**.
