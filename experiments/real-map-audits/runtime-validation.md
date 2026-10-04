# Runtime Validation Packet — Current 22-Map Batch

Status: **runtime execution pending**  
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

The current source-side audit remains closed regardless of these runtime outcomes.
