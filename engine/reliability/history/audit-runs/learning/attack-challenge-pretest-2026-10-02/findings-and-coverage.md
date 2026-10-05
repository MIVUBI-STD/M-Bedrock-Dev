# Attack Challenge v1.1.1 — Findings, Dispositions, and Coverage

> Companion experimental dataset for the workflow record. Non-authoritative; intended for detection-system learning.

## Final consolidated finding set

All “confirmed” wording below means confirmed at the stated **static/package proof ceiling**, not live Minecraft verification.

| ID | Severity | Category | Finding | Proof |
|---|---|---|---|---|
| ATK-01 | Blocker | Level / Structure | Next level can start after structure setup fails | STATIC VERIFIED |
| ATK-02 | Blocker | Objective / Flag | Level can remain active after required flag permanently fails to spawn | STATIC VERIFIED |
| ATK-03 | Major | Arena Protection / TNT | TNT placement handler can outrun illegal-placement rollback | STATIC VERIFIED |
| ATK-04 | Major | Death / Reconnect | Reconnect bypasses pending respawn ownership | STATIC VERIFIED |
| ATK-05 | Major | Recovery / Scoring | Reload recreates combat tracker without active-attempt statistics | STATIC VERIFIED |
| ATK-06 | Major | Death / Recovery | Reload cannot reconstruct pending death/respawn state | STATIC VERIFIED |
| ATK-07 | Major | Shop / Phase | Stale shop UI can commit without revalidating Buy Phase | STATIC VERIFIED |
| ATK-08 | Major | Victory / Entity Lifecycle | Combat tracking stops before remaining enemies are removed | STATIC VERIFIED |
| ATK-09 | Major | Level Transition | Buy Phase is not causally gated by structure setup completion | STATIC VERIFIED |
| ATK-10 | Major | Enemy Spawn / Encounter | Exhausted enemy spawn retries silently leave encounter active | STATIC VERIFIED |
| ATK-11 | Minor | Results / Version | Current v1.1.1 exports result metadata as v1.1.0 | STATIC VERIFIED |
| ATK-12 | Minor | Package / Entity Content | Entity definitions reference absent loot_tables/empty.json | PACKAGE VERIFIED |

## Finding detail

### ATK-01 — Blocker — Next level can start after structure setup fails

**Contradiction:** required world setup can fail without producing a rejected setup operation, while the upper gameplay flow can continue.

**Impact:** a Level can become playable with only part of its castle/pit/world state prepared, making routes, objective access, or contraptions unavailable.

**Root pattern:**

```text
structure sequence
→ one structure fails
→ setup returns non-throwing failure/null
→ remaining setup can stop
→ caller is not forced into failure recovery
→ gameplay transition continues
```

**System-learning class:** failure propagation; async setup; mechanic completeness; softlock.

### ATK-02 — Blocker — Required flag can permanently fail while Level stays active

**Contradiction:** the flag is required to complete Attack gameplay, but exhausted spawn retries do not own a terminal recovery/abort transition.

**Impact:** timer and combat can continue with no available win condition.

**System-learning class:** required-objective integrity; negative space; spawn exhaustion.

### ATK-03 — Major — TNT can bypass illegal-placement protection

**Contradiction:** Arena protection and TNT priming are competing owners of the same placement event.

```text
illegal placement
├─ protection owner → rollback/refund on later tick
└─ TNT owner        → remove block + prime TNT immediately
```

**Impact:** an illegal placement can still create an active explosive and can interact incorrectly with refund behavior.

**System-learning class:** same-event competing owner; temporal interaction; world mutation.

### ATK-04 — Major — Reconnect bypasses pending respawn

**Contradiction:** death owns a pending respawn callback, but reconnect independently restores the Player to active survival/loadout/position without consulting that pending state.

**Impact:** respawn downtime can be bypassed and the old callback can later apply another loadout/teleport.

**System-learning class:** deferred work; reconnect; stale state; double commit.

### ATK-05 — Major — Reload resets combat statistics used by the active attempt

Persisted session state survives reload, while CombatTracker statistics such as kills, deaths, and flag drops do not.

**Impact:** the recovered attempt can finish with scoring inputs that no longer represent what happened before reload.

**System-learning class:** persistence boundary; score integrity; recovery reconstruction.

### ATK-06 — Major — Reload loses pending death/respawn state

Pending respawn is memory-only. Active-session recovery has no persisted state from which to reconstruct “this Player is dead and has N seconds remaining”.

**Impact:** reload changes the gameplay lifecycle of a dead Player instead of preserving or deterministically restarting it.

**System-learning class:** persistence closure; death/recovery.

### ATK-07 — Major — Shop commit is not phase-bound

Opening the shop is phase-contextual, but the purchase commit path does not revalidate the current arena/session phase.

**Impact:** a form opened in Buy Phase can remain actionable after Active combat begins.

**System-learning class:** stale UI; commit-time authorization; phase boundary.

### ATK-08 — Major — Victory and enemy lifecycle are not atomic

Level completion stops CombatTracker before remaining enemies are removed. Enemy cleanup occurs later.

**Impact:** live enemies can coexist with Players during the victory window after normal combat ownership has ended.

**System-learning class:** terminal transition; cleanup order; entity lifecycle.

### ATK-09 — Major — Next Buy Phase can race world setup

Next-level structure setup and the fixed transition timer are independent rather than causally sequenced.

**Impact:** even a successful-but-slow setup can still be incomplete when the next phase begins.

**System-learning class:** readiness gate; async ordering; transition ownership.

### ATK-10 — Major — Enemy spawn exhaustion silently degrades encounter integrity

Configured enemy spawn retries can give up while the Level remains valid/active.

**Impact:** configured difficulty, enemy composition, and kill-score opportunity can be reduced without an explicit degraded-state contract.

**System-learning class:** silent degradation; encounter integrity.

### ATK-11 — Minor — Result metadata version is stale

Selected world/package: v1.1.1. Result metadata: v1.1.0.

**Impact:** exported QA/game results can be attributed to the wrong build.

**System-learning class:** provenance; version identity.

### ATK-12 — Minor — Missing loot-table resource

Entity content references `loot_tables/empty.json`, but the selected package does not contain that resource.

**Impact:** dangling package reference; exact runtime consequence remains platform-handling dependent.

**System-learning class:** package integrity; unresolved resource reference.

## Rejected / de-escalated hypotheses

Retaining these is important: a detection system improves by learning why plausible findings were **not** published.

### Six physical arenas but only two active
**Disposition:** designed/platform-constrained; not a bug.

Reason: physical replica count is not proof of intended concurrent capacity. The selected system explicitly owns admission/queue behavior and ticking-area resource allocation.

### Dead NPCs stay dead on retry
**Disposition:** selected design behavior; not a bug.

Reason: retry explicitly preserves killed-enemy state. Do not normalize every retry into a full world reset.

### Retry bonus coins
**Disposition:** no independent contradiction.

Reason: explicit retry balancing. Unusual interaction with preserved enemy state is not enough by itself.

### Developer script events
**Disposition:** not promoted.

Reason: source-level existence of a sensitive command is not proof that an ordinary Player can reach the prerequisite capability in the target deployment. Reachability/authorization evidence remained insufficient.

### Cross-arena block interaction
**Disposition:** not promoted.

Reason: validation appeared location-driven, but ordinary gameplay reachability into another arena was not sufficiently grounded. Do not convert hypothetical teleport/debug access into a normal-player bug.

### Ticking-area stale-cleanup / release races
**Disposition:** runtime residue, not published as gameplay bugs.

Reason: engineering race windows exist, but exact physical command scheduling and player-visible outcome require runtime evidence.

### Dynamic ticking coverage vs full structure footprint
**Disposition:** risk, not a confirmed gameplay defect.

Reason: ticking regions are not the only chunk-loading source; player-loaded chunks can contribute. Static geometric mismatch alone does not prove failed gameplay.

### Repeated static ticking setup
**Disposition:** not promoted.

Reason: source repeats setup commands, but duplicate-name behavior and actual resource accumulation depend on Bedrock command semantics.

### Flag reload duplication
**Disposition:** de-escalated after counter-evidence.

Reason: orphan/entity cleanup and restart handling provide competing recovery evidence. The original hypothesis was too aggressive to publish without runtime confirmation.

## Multi-arena coverage

| Surface | Disposition | Notes |
|---|---|---|
| Physical arena count | checked | six replicas |
| Coordinate projection | checked | per-arena offsets |
| Party identity | checked | per-arena party IDs |
| Session isolation | checked | arena-scoped session ownership |
| Entity isolation | checked | arena tags / scoped cleanup |
| Flag projection | checked | arena-aware coordinates/state routing |
| Score identity | checked | arena/session identity present |
| Structure projection | checked | arena-offset world setup |
| Contraption projection | checked | per-arena coordinate projection |
| Ticking lease naming | checked | per-arena names |
| Concurrent capacity | checked | two-active admission model |
| Queue model | checked | capacity-aware queue exists |
| Physical ticking command race outcome | blocked | requires runtime command scheduling evidence |
| Max-load TPS/AI behavior | blocked | requires live runtime |

## Gameplay lifecycle coverage

| Surface | Disposition | Primary learning |
|---|---|---|
| Lobby / join | checked | no surviving contradiction |
| Party / ready | checked | per-arena ownership |
| Countdown | checked | state transition understood |
| Queue / capacity | checked | 2-of-6 not a bug |
| Preload | checked | world-readiness dependency |
| Structure setup | checked | ATK-01, ATK-09 |
| Buy Phase | checked | ATK-07 |
| Shop / economy | checked | stale UI commit boundary |
| Kits / inventory | checked | reconnect intersects loadout |
| Combat | checked | lifecycle owner |
| NPC spawn | checked | ATK-10 |
| Flag objective | checked | ATK-02 |
| Death / respawn | checked | ATK-04, ATK-06 |
| Retry | checked | preserved deaths are designed |
| Scoring | checked | ATK-05, ATK-11 |
| Level progression | checked | ATK-01, ATK-09 |
| L11–L15 contraptions | checked statically | no independent per-level contradiction admitted |
| TNT / build protection | checked | ATK-03 |
| Disconnect / reconnect | checked | ATK-04 |
| Reload / recovery | checked | ATK-05, ATK-06 |
| Victory | checked | ATK-08 |
| Cleanup | checked | terminal ordering analyzed |
| Arena reuse | checked statically | live repeated-run proof remains runtime |
| Package references | checked | ATK-12 |
| AI/pathing/TPS | blocked | live runtime required |
| Visual/UI rendering | blocked | live runtime required |

## Per-level coverage conclusion

No level-specific issue was invented merely because a stage is unique.

- Levels 1–10: systemic structure/spawn/objective/lifecycle defects cover the shared core.
- Levels 11–15: interaction-state complexity was inspected; no additional independent static contradiction survived consolidation.
- Level 15 maximum-load behavior remains a runtime proof boundary, not a static bug.

## Proof discipline learned

Use these labels literally:

- `STATIC VERIFIED`: contradiction can be derived from selected source/control flow.
- `PACKAGE VERIFIED`: package/resource mismatch is directly observable.
- `LOCAL GAME VERIFIED`: requires actual local Minecraft execution.
- `LIVE GAME VERIFIED`: requires observed gameplay behavior.
- `UNKNOWN`: evidence insufficient.

Never upgrade static proof because a runtime outcome “sounds obvious”.

## Detection-system backlog from this dataset

High-value generic detectors to improve:

1. async failure propagation / swallowed failure;
2. required-objective producer without terminal recovery;
3. stale UI/form commit without phase revalidation;
4. delayed callback without state revalidation;
5. persisted-session vs in-memory gameplay-state closure;
6. terminal transition with non-atomic actor cleanup;
7. competing subscribers mutating the same event;
8. encounter integrity after retry exhaustion;
9. selected-artifact version identity across export metadata;
10. dangling package-resource references;
11. replica-count vs concurrency-intent challenge;
12. root-cause consolidation across repeated levels.

Do **not** encode Attack-specific names, coordinates, items, or level numbers as production detection rules. Use this map only as regression evidence for generic reasoning primitives.
