# Runtime Validation Packet — Build & Decode v1.1.0

Status: **runtime execution pending**  
Authority: selected current artifact only  
Artifact: `Build & Decode v1.1.0.mcworld`  
SHA-256: `d83cd5e699dfe2676a540a3cdca2b4797a34c75984cac3142488a1556cff7030`

Purpose: close only the three remaining runtime/deployment facts after deterministic source + LevelDB voxel reduction.

This file is a **validation projection**, not bug authority. No map repair belongs here.

## Reduction already completed

The following are no longer runtime questions:

- physical arena containment — **PROVEN finding**: `BUG-BAD-PHYSICAL-ARENA-ESCAPE`;
- Arena 1–4 active gameplay/loading geometry — **bounded voxel equivalence**;
- lobby team-pad reachability — all eight team pads remain reachable in Arena 1–4;
- lobby same-level containment — no walkable escape path found;
- multi-arena logical ownership, match identity, ticking-area naming and generation-bound reset — source-closed;
- four-arena ticking-area capacity — 1 lobby + 4 arena areas = 5 named areas;
- reset command ownership — one FIFO queue, 11 fill batches per arena, 44 batches worst-case for four simultaneous resets.

## Execution rule

Run only the exact deciding scenarios below.

```text
PASS
or
FAIL → promote only the observed wrong player-visible outcome
or
INCONCLUSIVE → keep explicit runtime residue
```

Do not run a broad playthrough.

---

## RT-BAD-FOUR-ARENA-LIVE — full four-arena native concurrency

**Deciding question:** Can all four arenas execute their normal start/play/transition/reset lifecycle concurrently without a native Bedrock command/scheduler failure?

### Static proof already closed

- four logical arena owners are independent;
- all four arena ticking-area names are unique;
- total named ticking areas remain within the authored resource model;
- each active loading footprint is about 16 chunks;
- reset work is generation-bound;
- shared fill work is serialized rather than concurrently mutating the world;
- no source-level two-arena cap exists.

### Trigger

1. Form four independent valid parties, one in each arena.
2. Start all four sessions within the same short window.
3. Reach active gameplay in all four.
4. Cause overlapping round transitions/reset work.
5. Complete or end all four sessions.

### PASS

- all four reach active gameplay;
- no arena loses its own ticking-area lease;
- no arena stalls because another arena is resetting;
- each score/result remains arena-scoped;
- each arena reset completes and becomes reusable.

### FAIL / promote

Promote only if one of these is observed:

- one or more arenas cannot start/continue because native ticking-area or command execution fails;
- one arena's reset/command execution blocks another arena indefinitely;
- native scheduling produces cross-arena mutation despite source ownership guards;
- an arena cannot become reusable after the overlapping lifecycle.

**Promotion severity:** Blocker only if required gameplay cannot normally start/continue/complete and recovery is unavailable; otherwise Major.

---

## RT-BAD-RELOAD-FOUR-PHASES — mixed-phase runtime reload/rebind

**Deciding question:** Does native script/world reload preserve or safely reconcile four independent arenas when each is in a different lifecycle phase?

### Static proof already closed

Restorable phases:

```text
playing
round_countdown
round_end
round_selection
suspended
```

Cleanup-owned phases:

```text
preparing
resetting
match_end
```

Static guards already verified:

- persisted arena identity is validated before binding;
- duplicate persisted membership is rejected;
- recovery intent must match arena/match;
- generation increments invalidate stale continuations;
- restorable sessions return through suspended/reconcile before resume;
- interrupted preparation/reset/result routes through cleanup/cancellation rather than blind resume.

### Trigger

Create four independent arena states, for example:

```text
Arena 1 → playing
Arena 2 → round_countdown
Arena 3 → round_end / round_selection
Arena 4 → resetting or match_end
```

Then perform the real deployment's script/world reload and allow recovery to settle.

### PASS

- each player remains owned by at most one original arena;
- Arena 1–3 restore/pause/resume according to their saved phase;
- Arena 4 completes cleanup/cancellation without leaking state;
- no old callback or reset mutates a newer run;
- score/result ownership remains attached to the original match;
- all four arenas eventually reach a valid resumable or idle state.

### FAIL / promote

Promote only if reload causes:

- cross-arena membership or state ownership;
- duplicated/stale player recovery;
- wrong arena role/score/result restoration;
- stale reset/command work corrupting another or newer run;
- an arena becoming unrecoverably stuck.

**Promotion severity:** Blocker when the affected arena/session cannot recover or gameplay cannot continue; otherwise Major.

---

## RT-BAD-DEPLOYMENT-MULTIPLAYER — actual hosting configuration

**Deciding question:** Does the actual deployment enable multiplayer before players use this map?

### Artifact evidence

Selected `level.dat` stores:

```text
MultiplayerGame       = 0
MultiplayerGameIntent = 0
LANBroadcast          = 0
LANBroadcastIntent    = 1
educationFeaturesEnabled = 1
```

No Build & Decode-specific deployment/runtime profile was found in the repo that proves an override.

### Trigger

Use the exact deployment method intended for production.

### PASS

- the deployed world accepts the intended multiplayer session;
- at least two players can enter the same game flow;
- no manual per-copy setting change is required beyond the documented deployment procedure.

### FAIL / promote

If the production delivery method honors the package setting and prevents the authored multiplayer game from being entered, promote as a release/deployment DESIGN_MISMATCH or BUG according to the grounded deployment contract.

**Potential severity:** Blocker because the authored game requires at least two players.

---

## Completion condition

This packet is complete when all three items have one terminal disposition:

```text
PASS
FAIL → promoted with exact evidence
INCONCLUSIVE → explicit runtime residue
```

Until then:

```text
Static deterministic knowledge = CLOSED
Vital Gameplay Knowledge       = OPEN
Bug repair                      = OUT OF SCOPE
```
