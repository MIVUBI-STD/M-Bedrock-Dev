# Real Map Audit — Aftershock v1.0.4

Status: real-map source audit complete for this pass  
Authority: selected current Drive artifact only  
Historical regression ingestion: none  
Runtime execution: not performed

## Target

- Drive file: `Aftershock v1.0.4.mcworld`
- Drive file ID: `1eSlTNBhoWslPs8xUlxsK0FVEkBe3uGz1`
- Artifact SHA-256: `b8bff14da9e71bf58f9d3b277408ec00d51d1193cee5c8eb1b3f7644584fbab9`
- Behavior Pack manifest: `1.0.4`
- Min engine version: `1.21.130`
- Internal level name: `Daigon Aftershock v1.0.4`

## Proven findings

**0 source-proven gameplay defects admitted in this pass.**

## Checks completed

### Arena/session ownership

The artifact defines six arenas and persists session, arena lease, objective runtime, escrow, and result state separately. Arena leases bind `sessionId + playerId`, and active objective systems validate the current session/lease before accepting gameplay actions.

### Disconnect / reconnect

Active/loading sessions move to `interrupted` with a five-minute resume budget. Progress timers are paused/recovered for transition-sensitive objective states.

Reconnect:
- finds the same persisted session;
- clears the interruption timer;
- restores the session to active;
- reconciles the correct checkpoint/baseline before continuing.

Disconnect expiry:
- records an unfinished result with `disconnect_expired`;
- changes the session to resetting;
- resets/verifies baseline;
- releases arena/runtime ownership;
- keeps inventory escrow available for later player restoration.

No stale-arena reuse or reconnect bypass was proven.

### Reset / generation safety

World baselines are reset through the current session/arena context before arena release. Current source separates active lease ownership from reset/recovery and does not expose the arena as a fresh ordinary session while old baseline recovery still owns it.

### Developer surfaces

Developer bamboo/setup and database-reset commands require developer/operator ownership.

The bundle also contains scanner/selection adapter surfaces without an obvious inline permission check. They are **not admitted** because this pass did not prove an ordinary gameplay path to the required developer wand/script-event capability.

## Audit obligations — not bugs

- Runtime physics/entity interactions in quarry/ascent remain runtime-sensitive.
- Developer scanner/wand reachability should be runtime-checked only if ordinary players can actually obtain/invoke those surfaces.

## Result

Aftershock v1.0.4: **0 source-proven gameplay findings**.

Do not create historical regression entries from this pass.
