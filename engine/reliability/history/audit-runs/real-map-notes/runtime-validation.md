# Runtime Validation Packet — Current 22-Map Batch

Status: **reconciliation open — runtime execution pending**  
Authority: selected current artifacts already bound in `workspace/project-registry.json`  
Purpose: close only irreducible Minecraft-runtime residue left after the source/package deep pass.

This file is a **validation projection**, not current bug authority.  
Promotion rule:

```text
selected artifact
→ exact runtime scenario below
→ wrong player-visible outcome reproduced
→ evidence retained
→ promote to Map Audit finding
→ human approval
→ canonical Bug Report V2
```

Do not add a bug merely because the source contains a risky timing/resource pattern.

## Reconciliation ledger contract

This file is the single batch-level reconciliation projection for material findings that are not already canonical PROVEN Bug Report V2 issues.

Every material candidate referenced by the real-map audits must end with exactly one disposition:

```text
PROVEN_CANONICAL:<bug-id>
RUNTIME_IRREDUCIBLE_HIGH:<runtime-id>
RUNTIME_IRREDUCIBLE_MEDIUM:<runtime-id>
RUNTIME_IRREDUCIBLE_LOW:<runtime-id>
CONDITIONAL:<runtime-id>
STATIC_COUNTERPROOF:<evidence>
DISPROVEN_CURRENT_ARTIFACT:<counter-proof>
RELEASE_HEALTH:<reason>
INTENTIONALLY_EXCLUDED:<reason>
```

Rules:

- approval/filtering is never a disposition;
- every RUNTIME_IRREDUCIBLE or CONDITIONAL disposition must point to one exact runtime scenario in this file;
- STATIC_COUNTERPROOF removes an item from active runtime validation only when selected-current-artifact evidence directly blocks the suspected failure path;
- DISPROVEN_CURRENT_ARTIFACT requires selected-current-artifact counter-proof;
- RELEASE_HEALTH remains visible but is not promoted to gameplay BUG without a grounded player-visible consequence;
- no material candidate may disappear between a per-map audit, this ledger, and canonical report projection.

Batch conservation is not CLOSED while any active RUNTIME_IRREDUCIBLE item is unexecuted or INCONCLUSIVE. CONDITIONAL items are active only when their stated prerequisite is present. This does not turn runtime residue into a bug; it prevents the audit from being described as exhaustive/final prematurely.

### Current reconciliation dispositions from client re-check

| Candidate | Current disposition | Basis |
| --- | --- | --- |
| Attack last-second double ending | DISPROVEN_CURRENT_ARTIFACT | Current `endGame(arenaId, "victory")` rechecks timer expiry and converts late victory to timeout before completion handling. |
| Attack ticking-area lease handoff | RUNTIME_IRREDUCIBLE_HIGH:RT-ATK-LEASE-HANDOFF | Async Minecraft-area removal can overlap logical lease reuse; exact command interleaving is runtime-sensitive. |
| Defense ticking-area lease handoff | RUNTIME_IRREDUCIBLE_HIGH:RT-DEF-LEASE-HANDOFF | Same release/acquire boundary with three residency regions. |
| Defense Speed Potion delivery atomicity | RUNTIME_IRREDUCIBLE_HIGH:RT-DEF-SPEED-POTION | Failure consequence is source-grounded; target-runtime command success is not. |
| Defense internal version label v1.1.0 vs delivered v1.1.1 | RELEASE_HEALTH | Current metadata identity mismatch without grounded gameplay consequence. |
| Circuit missing gameplay ticking areas | DISPROVEN_CURRENT_ARTIFACT | Current PathwayLoader dynamically creates/removes arena-specific `circuit_path_<arena>` residency. |
| Circuit five-player capacity | INTENTIONALLY_EXCLUDED | Current artifact proves max_member 5 but no independent selected-artifact requirement for >5 players is grounded. |
| Circuit version 1.0.2 / pack 1.0.1 / internal 1.0.0 | RELEASE_HEALTH | Current artifact identity is inconsistent, but no gameplay failure is yet grounded. |
| Circuit far-chunk pathway residency | RUNTIME_IRREDUCIBLE_HIGH:RT-CIRCUIT-FAR-CHUNK | Dynamic residency exists; sufficiency under deployed simulation timing remains runtime-sensitive. |
| Circuit round reconnect recovery | RUNTIME_IRREDUCIBLE_MEDIUM:RT-CIRCUIT-RECONNECT | Distinct round recovery owners require representative runtime proof. |
| Five Nights L1 cave/windmill remote simulation | RUNTIME_IRREDUCIBLE_LOW:RT-FNZ1-REMOTE-SIM | Current source has chunk-loaded spawn retry/bridge residency; remaining remote route behavior is runtime-sensitive. |
| Deprecated command/API residue | RELEASE_HEALTH | Deprecation alone is not a gameplay defect; promote only when current hot-path behavior fails. |
| Hardcoded spectator/default-arena residue | CONDITIONAL:RT-DEFAULT-ARENA-REACHABILITY | Must prove whether the dormant/default-arena path is reachable from a non-default active session before classification. |
| Queued/requested kit-station materialization | CONDITIONAL:RT-KIT-STATION-MATERIALIZATION | Queue/request evidence is not proof that all required stations materialize in world state. |
| Clockwork cinematic disconnect/transition recovery | RUNTIME_IRREDUCIBLE_LOW:RT-CLOCKWORK-DISCONNECT | Exact disconnect timing and client presentation are runtime-sensitive. |
| Five Nights L2 Drive filename/version identity | RELEASE_HEALTH | Operator-facing artifact identity mismatch without grounded gameplay consequence. |
| Orb L1 disconnect at objective boundary | RUNTIME_IRREDUCIBLE_LOW:RT-ORB1-OBJECTIVE-DISCONNECT | Source does not prove a bypass; exact objective/disconnect interleaving remains runtime-sensitive. |
| Raid kit durability refresh | RUNTIME_IRREDUCIBLE_MEDIUM:RT-RAID-KIT-DURABILITY | Per-kit durability refresh requires deployed-runtime confirmation across all four kits. |
| Raid four-arena entity/score isolation | STATIC_COUNTERPROOF | Membership, gameplay tags, timers, match state, finish/reset and cleanup are arena-scoped; inspected global loops are not arena mutation authority. |

## Runtime priority after deep static counter-proof

### HIGH — execute first

- `RT-CLOCKWORK-WORKSHOP-TA` — source proves six arenas contend for one global ticking-area name; runtime only decides player-visible manifestation.
- `RT-ATK-LEASE-HANDOFF` — source proves logical lease reuse can begin before physical area removal settles.
- `RT-DEF-LEASE-HANDOFF` — same handoff window across three residency regions.
- `RT-DEF-SPEED-POTION` — transaction consequence is grounded; target-runtime command delivery decides reachability.
- `RT-CIRCUIT-FAR-CHUNK` — dynamic residency exists, but deployed simulation sufficiency decides progression.

### MEDIUM

- `RT-BBW-DEATH-LEAVE` — same-tick terminal ordering is engine-scheduler dependent.
- `RT-RAID-DEATH-LEAVE` — same terminal-ordering class with explicit match lifecycle.
- `RT-RAID-KIT-DURABILITY` — actual item durability state requires runtime observation.
- `RT-CIRCUIT-RECONNECT` — round-specific recovery owners need representative runtime proof.
- `RT-AFTERSHOCK-PHYSICS` — physics/entity semantics are runtime-owned.

### LOW

- `RT-FNZ1-REMOTE-SIM` — source already has chunk-loaded spawn retry and bridge residency.
- `RT-FNZ2-NAVIGATION` — session/generation and spawn-failure handling are hardened; terrain navigation remains runtime-owned.
- `RT-ORB1-NAVIGATION` — source has scoped context/recovery counter-proof; only actual navigation remains.
- `RT-ORB1-OBJECTIVE-DISCONNECT` — no source bypass found; exact boundary ordering remains.
- `RT-CLOCKWORK-DISCONNECT` — persistence/interruption ownership is explicit; exact cinematic handoff remains.
- `RT-MOB2-SHARED-ENTITY` — inspected global loops are non-progression owners; exact entity timing remains.

### STATIC COUNTER-PROOF — remove from active runtime queue

- `RT-MOB1-SHARED-BUTTON`: `syncButtons()` unions all active required levels for the shared physical map and fails closed if projection cannot be verified.
- `RT-RAID-CLEANUP-RETRY`: durable `match_cleanup_pending` blocks fresh admission and cleanup is retried until success.
- `RT-RAID-FOUR-ARENA-ISOLATION`: membership, tags, timers, match state, finish/reset and cleanup are arena-scoped; global loops inspected are not mutation authority.

### CONDITIONAL

- `RT-BBW-TERRAIN-CLEANUP`: execute only when a normal match actually leaves mutable terrain requiring journal restoration.
- `RT-DEFAULT-ARENA-REACHABILITY`: execute only for a specifically identified artifact retaining a reachable hardcoded default-arena path.
- `RT-KIT-STATION-MATERIALIZATION`: execute only for a specifically identified artifact where required station placement is queued/requested and presence is not already statically proven.

## Execution rule

- Use the exact current artifact/version already bound in the project registry.
- Run only the scenario listed for that residue.
- Do not rerun full-map testing.
- A PASS closes only this runtime obligation.
- A FAIL promotes only when the stated wrong player-visible outcome is observed.
- Unknown/inconclusive results remain runtime residue; they are not converted to PASS.

---

## Attack Challenge v1.1.1

### RT-ATK-LEASE-HANDOFF — capacity+1 ticking-area handoff

**Deciding question:** Can Arena 3 acquire all required ticking areas when one of two active arenas releases its lease, while old asynchronous removals are still completing?

**Trigger**
1. Run Arena A and Arena B concurrently.
2. Queue Arena C.
3. End Arena A while Arena B remains active.
4. Allow Arena C to acquire immediately.

**PASS**
- Arena C creates all required arena ticking areas.
- Arena C enters gameplay normally.
- Arena B remains unaffected.

**FAIL / promote**
- Arena C cannot create one or more required areas, aborts, stalls, or loses simulation because prior-area removal overlaps the new acquisition.

**Promotion class:** BUG, severity based on whether the new session cannot start/continue.

---

## Defense Challenge v1.1.1

### RT-DEF-LEASE-HANDOFF — capacity+1 ticking-area handoff

Same boundary as Attack, using Defense's three arena residency regions.

**PASS**
- Third arena obtains all three required regions and continues normally.

**FAIL / promote**
- Third arena fails/stalls/loses simulation during the previous arena's async removal window.

### RT-DEF-SPEED-POTION — transaction failure behavior

**Deciding question:** Does the configured Speed Potion delivery command succeed on the deployed runtime?

**Trigger**
1. Enter the shop with at least 12 coins.
2. Buy Speed Potion.

**PASS**
- Potion is delivered and the normal price is consumed once.

**FAIL / promote**
- Delivery fails while coins remain consumed and/or purchase success feedback is still shown.

**Promotion class:** BUG, economy/player-state.

---

## Five Nights at Z Village L1 v1.1.0

### RT-FNZ1-REMOTE-SIM — cave/windmill remote simulation

**Deciding question:** Do required remote actors remain simulated and reach their intended route/objective while players follow normal authored positioning?

**PASS**
- Required actors spawn only after their target chunk is ready.
- Cave/windmill route actors remain simulated and progression resolves normally.

**FAIL / promote**
- Required actors stall/unload/fail to progress in a way that blocks or incorrectly advances the game.

## The Clockwork Vault v1.0.1

### RT-CLOCKWORK-WORKSHOP-TA — overlapping Workshop cinematics

Source proves all six arenas use the same ticking-area name:
`clockwork_workshop_cinematic`.

**Trigger**
1. Run two independent Clockwork arenas.
2. Reach Workshop in both.
3. Overlap both Workshop intro cinematics.
4. Allow one cinematic to end while the other is still running.

**PASS**
- Both cinematics complete.
- Custodian/entity behavior continues.
- Dialogue/audio and transition remain correct in both arenas.

**FAIL / promote**
- One arena's cinematic end/start removes or relocates residency required by the other, producing stalled entity/cinematic/transition behavior.

**Promotion class:** BUG, multiplayer-session / simulation ownership.

---

### RT-CLOCKWORK-DISCONNECT — cinematic/transition disconnect recovery

**Trigger**
1. Start a normal Clockwork cinematic/transition.
2. Disconnect one participant at the handoff boundary.
3. Reconnect before or after the transition commits.

**PASS**
- Arena ownership, player state, Custodian/entity state, dialogue/audio, and transition resolve to one intended state.

**FAIL / promote**
- Reconnect leaves stale cinematic state, duplicates/skips progression, or produces a wrong player-visible transition.

## Beach Bedwars v1.1.0

### RT-BBW-DEATH-LEAVE — same-tick death/disconnect ordering

**Trigger**
1. Enter an active match.
2. Make a player die and disconnect/leave within the same terminal window.
3. Observe respawn/elimination/team state.

**PASS**
- Player has one deterministic terminal state.
- No duplicate elimination, stale respawn, or blocked match completion occurs.

**FAIL / promote**
- Conflicting death/leave owners create duplicate/stale state visible to players.

### RT-BBW-TERRAIN-CLEANUP — only when match mutation is present

Run only if normal gameplay leaves player-built/changed terrain behind.

**PASS**
- Next run starts from expected baseline.

**FAIL / promote**
- Previous-run terrain materially affects the next match.

---

## Five Nights at Z Village L2 v1.2.2

### RT-FNZ2-NAVIGATION — real terrain navigation/simulation

Run only the historically sensitive remote Pillager route.

**PASS**
- Required actors remain simulated, reach intended route/objective, and progression does not stall.

**FAIL / promote**
- Required actor stalls/despawns/unloads in a way that blocks or incorrectly advances gameplay.

---

## Orb of the Illusioner L1 v1.2.1

### RT-ORB1-NAVIGATION — objective actor simulation

**PASS**
- Required actors/objective state remain active and progression resolves normally.

**FAIL / promote**
- Runtime entity/navigation/simulation behavior causes a wrong objective/progression state that source cannot decide.

---

### RT-ORB1-OBJECTIVE-DISCONNECT — disconnect at objective boundary

**Trigger**
1. Reach a material Orb L1 objective transition.
2. Disconnect one required participant in the same/adjacent transition window.
3. Reconnect and observe objective ownership/progression.

**PASS**
- Objective state resolves once and reconnect returns to the authored state.

**FAIL / promote**
- Disconnect/reconnect skips, duplicates, resets incorrectly, or bypasses objective progression.

## Mysteries of Biomes L1 v1.0.4

### RT-MOB1-SHARED-BUTTON — simultaneous player interaction

**Trigger**
1. Use two players around the shared button/object state.
2. Interact within the same or adjacent tick window.

**PASS**
- Player/session state and visible button state remain consistent for both.

**FAIL / promote**
- One player's interaction produces cross-player visual/state corruption or wrong progression.

---

## Mysteries of Biomes L2 v2.1.1

### RT-MOB2-SHARED-ENTITY — simultaneous shared-entity timing

**Trigger**
1. Two players interact with the same relevant world entity/objective surface in overlapping timing.
2. Observe ownership/progression for both.

**PASS**
- One valid state transition occurs per intended owner.

**FAIL / promote**
- Shared entity timing duplicates, skips, or transfers progression/state between players.

---

## Raid Arena Classic v1.1.0

### RT-RAID-DEATH-LEAVE — combat/death/leave ordering

**Trigger**
1. Active match with at least two players.
2. One player dies and disconnects/leaves during the result/respawn boundary.

**PASS**
- Cleanup, result ownership, team state, and remaining players remain consistent.

**FAIL / promote**
- Duplicate/stale respawn/result/cleanup state remains.

### RT-RAID-CLEANUP-RETRY

**Trigger**
1. Disconnect a participant during result presentation/cleanup.
2. Let cleanup retry/recovery run.
3. Start the same arena again.

**PASS**
- Second run starts from clean participant and arena state.

**FAIL / promote**
- Old participant/session state leaks into the next run.

---

### RT-RAID-KIT-DURABILITY — all-kit durability refresh

**Trigger**
1. Exercise each of the four normal kits through durability loss.
2. Cross the authored refresh/reset boundary.
3. Repeat on a second run.

**PASS**
- Every kit returns to its intended durability/state exactly once.

**FAIL / promote**
- Any kit retains stale durability, duplicates equipment, or refreshes inconsistently.

### RT-RAID-FOUR-ARENA-ISOLATION — maximum parallel isolation

**Trigger**
1. Run all four Raid arenas concurrently with independent parties.
2. Exercise entity, score, result, and cleanup paths in overlapping windows.

**PASS**
- Entity/score/result/cleanup state remains arena-scoped.

**FAIL / promote**
- Any arena mutates or observes another arena's entity, score, result, or cleanup state.

## The Circuit v1.0.2

### RT-CIRCUIT-FAR-CHUNK — pathway marker/entity residency

**Trigger**
1. Run a gameplay round whose required actor/marker is far from the player-loaded region.
2. Follow normal progression without manually preloading that location.

**PASS**
- Dynamic PathwayLoader residency keeps required actors/markers available and progression continues.

**FAIL / promote**
- Required marker/entity fails because the dynamic area does not provide sufficient runtime residency.

### RT-CIRCUIT-RECONNECT — round-specific recovery

Run reconnect at one representative state for each distinct recovery owner, not every trivial sub-step.

**PASS**
- Player returns to the same intended arena/round state or the authored reset state.

**FAIL / promote**
- Reconnect duplicates, skips, or corrupts round progression.

---

## Aftershock v1.0.4

### RT-AFTERSHOCK-PHYSICS — Quarry / Ascent runtime interaction

**Trigger**
1. Exercise normal Quarry and Ascent objective interactions.
2. Include the Stoneball/wind/entity surfaces used by the active objective.

**PASS**
- Physics/entity interactions resolve against the correct active arena/session and objective.

**FAIL / promote**
- Runtime physics/entity behavior makes the required objective impossible, incorrect, or cross-session.

---

## Cross-map targeted residue

### RT-DEFAULT-ARENA-REACHABILITY — hardcoded default-arena/spectator residue

Run only on artifacts where audit evidence retains a hardcoded default arena/session path.

**PASS**
- The path is unreachable in production, permission-gated, or resolves the current arena/session before mutation.

**FAIL / promote**
- A player in a non-default arena can reach the path and is teleported, mutated, messaged, or cleaned against the wrong arena/session.

### RT-KIT-STATION-MATERIALIZATION — queued/requested station delivery

Run only on artifacts where required kit/station placement is queued/requested rather than statically proven present.

**PASS**
- Every required station becomes materially present before players depend on it and remains owned by the correct arena/session.

**FAIL / promote**
- A required station remains absent/partial/stale while gameplay exposes it as available, blocking or misdirecting player interaction.

## Completion condition

This runtime packet is complete when every item above has exactly one final disposition:

```text
PASS
or
FAIL → promoted with exact player-visible evidence
or
INCONCLUSIVE → remains explicit runtime residue
```

Do not convert INCONCLUSIVE to PASS.

Static/source proof may be complete, but batch reconciliation remains PARTIAL while any active RUNTIME_IRREDUCIBLE item is unexecuted or INCONCLUSIVE. STATIC_COUNTERPROOF items are closed by current-artifact evidence; CONDITIONAL items activate only when their prerequisite is grounded. The audit may only be described as exhaustive/final after every material candidate has an explicit terminal disposition and the conservation ledger balances.
