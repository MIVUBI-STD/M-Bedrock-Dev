# Runtime Test Queue

> **Status: SYSTEM_REDUCTION_REQUIRED** — these probes are not assigned to the user. The audit system must reopen and reduce them first. Manual testing is allowed only after the Manual Test Last-Resort Gate proves one runtime-native deciding fact remains.

> Minimal high-value runtime probes. These are **not** current BUG/NEED_VALIDATION findings.

## Policy

- Do not replay entire maps.
- One probe answers one exact question.
- A clean runtime probe creates no issue.
- A failure must go through source cross-check and the normal PROVE gate before publication.

## Priority A — closed by system-side reduction

### 1. Fall of the Pillager Level 2 — RTQ-FOP2-CUTSCENE-DISCONNECT

**Question:** Does disconnecting during the cutscene/session-admission transition leave the resumed gameplay state fully initialized?

**Start:** Reach a normal cutscene immediately before active gameplay or the next authored gameplay phase.

**Steps**
1. Disconnect while the cutscene is still active.
2. Stay offline until the cutscene would normally finish.
3. Reconnect to the same session.
4. Continue the first gameplay action after the transition.

**PASS:** The cutscene/transition resumes or reconciles cleanly and the next gameplay phase behaves normally.

**FAIL:** The phase advanced while offline and one or more gameplay systems are missing, stale, blocked, duplicated, or desynchronized.

**Why this test:** Circuit exposed a real offline-transition defect. FOP2 has an explicit cutscene/session-admission lifecycle and reconnect handling, so this is a direct high-value cross-map probe.

### 2. Beach Bedwars — RTQ-BBW-OBJECTIVE-RESPAWN-RACE

**Question:** Can a player disconnect/reconnect around bed destruction or elimination and end in a state that disagrees with the authoritative team/respawn state?

**Start:** Two teams active; target player still has a live bed and is participating normally.

**Steps**
1. Destroy the target player's/team bed near the same time the target player dies or disconnects.
2. Reconnect the target player immediately after the bed state changes.
3. Observe respawn/elimination behavior.
4. Check whether team/objective/UI state agrees with whether respawn is still allowed.

**PASS:** Bed state, player elimination, respawn permission, and UI all agree.

**FAIL:** Player respawns when no longer eligible, is eliminated while still eligible, or objective/UI state disagrees with the actual lifecycle.

**Why this test:** This combines objective terminal state, death/respawn and reconnect—three material Bedwars systems already identified by the audit.

### 3. Raid Arena Classic — RTQ-RAID-KIT-RECONNECT

**Question:** Can kit/equipment state be retained, duplicated, or lost across death plus reconnect?

**Start:** Select a non-default kit/loadout and enter active combat.

**Steps**
1. Change or equip a managed kit/loadout.
2. Die or enter the map's normal death/respawn lifecycle.
3. Disconnect before or during the restore/respawn boundary.
4. Reconnect and inspect inventory, armor/equipment, and active kit state.

**PASS:** Exactly one valid kit is present and all kit/equipment state matches the authoritative selection.

**FAIL:** Old and new kit items coexist, required equipment is missing, or UI/selection state disagrees with inventory/equipment.

**Why this test:** The map has explicit kit/loadout, combat, reconnect and fresh-session state surfaces but no runtime ground truth yet.

### 4. Five Nights at Z Village Level 2 — RTQ-FNZ2-REMOTE-WAVE-PROGRESS

**Question:** Do remote spawned enemies continue simulating and allow the defense wave to progress when the player remains at the normal defense/base position?

**Start:** Start the first representative defense wave from the authored player position.

**Steps**
1. Do not move toward the remote enemy spawn area.
2. Let the wave run from the intended defense/base location.
3. Observe whether enemies path/attack and whether wave accounting advances.
4. Repeat once after a retry or second run if the first pass succeeds.

**PASS:** Enemies remain active, reach/engage the objective, and wave completion accounting progresses normally.

**FAIL:** Enemies freeze/despawn/stall outside simulation range or wave progression blocks while the player stays in the intended play area.

**Why this test:** The map materially depends on residency, remote simulation and wave accounting. Native simulation behavior is one of the highest-value runtime-only surfaces.

### 5. Orb of the Illusioner Level 1 — RTQ-ORB1-UPGRADE-RECONNECT

**Question:** Does an equipment/economy upgrade remain atomic if the player disconnects immediately after purchase?

**Start:** Player has enough currency for one weapon or armor upgrade.

**Steps**
1. Purchase one upgrade.
2. Disconnect immediately after the purchase is accepted.
3. Reconnect to the same active session.
4. Compare currency, equipment tier, inventory item, and any upgrade/UI state.

**PASS:** Currency and upgraded equipment commit exactly once and all representations agree.

**FAIL:** Currency is deducted without the item, upgrade duplicates, old equipment remains alongside new equipment, or UI/tier state disagrees.

**Why this test:** Orb L2 already demonstrated a real transactional upgrade defect. Orb L1 has equivalent economy/equipment surfaces but no source-proven issue.

### 6. The Clockwork Vault — RTQ-CLOCKWORK-KEY-RELOAD

**Question:** Does a key/item-driven puzzle remain consistent across an active-session world reload?

**Start:** Acquire or activate a material key/item/mechanism but stop before the next puzzle/terminal commit.

**Steps**
1. Reach a state where the key/item or mechanism is acquired/activated.
2. Reload/re-enter the world while the session is still logically in progress.
3. Continue the same puzzle interaction.
4. Check inventory/item state, mechanism/world state, and progression.

**PASS:** The item/mechanism and progression state reconstruct to one coherent state and the puzzle remains completable.

**FAIL:** Item exists but mechanism resets, mechanism remains active but item/progression resets, or the puzzle becomes duplicated/stuck.

**Why this test:** Clockwork Vault explicitly combines key/item lifecycle, entity/mechanism state, world mutation and active-session reload.

### 7. Marathon Test of Tactics Level 2 — RTQ-MTT2-ROUND-TRANSITION-RECONNECT

**Question:** Can reconnect during a round transition leak the prior round's loadout/score/state into the next round?

**Start:** Reach the end of one round with non-default loadout or non-zero score/progress.

**Steps**
1. Trigger normal round completion.
2. Disconnect during the transition before the next round is fully ready.
3. Reconnect after the next round has started or is preparing.
4. Check loadout, score/reward state, team/participant state, and next-round readiness.

**PASS:** Only intended cross-round state survives; next-round loadout and progression are correct.

**FAIL:** Old loadout/resources remain, required new state is missing, reward/score commits twice, or the player is not correctly assigned to the new round.

**Why this test:** The map has explicit round transitions, loadout, score/reward, reconnect and repeated-run state but no runtime ground truth.

### 8. Aftershock — RTQ-AFTERSHOCK-SECOND-RUN-WORLD

**Question:** Does a second run begin from the same effective world/objective baseline as the first run?

**Start:** Complete one normal run far enough to mutate world/objective/entity state.

**Steps**
1. Finish or reset the first run normally.
2. Start a second run without re-importing/restarting the world.
3. Compare the initial objective/world state with the first run.
4. Attempt the first progression interaction of the second run.

**PASS:** Second-run world, entities, objectives and player state match the authored fresh baseline.

**FAIL:** A world mutation/entity/objective from run 1 survives or a required run-2 state is missing/duplicated.

**Why this test:** Aftershock contains explicit world mutation/reset, entity lifecycle, reconnect and reload surfaces and currently has only a prospective zero-finding snapshot.


## Priority B

### 1. Mysteries of Biomes Level 2 — RTQ-BIO2-STAGE-RELOAD

**Question:** Does reload during a stage transition preserve exactly one valid objective/progression state?

**Reason:** Stage progression + spatial/world mutation + reload recovery are all material surfaces.

### 2. Fall of the Pillager Level 1 — RTQ-FOP1-FRIENDLY-FIRE-FIX-VERIFY

**Question:** After developer fix, can one cooperative player still damage another?

**Reason:** Regression verification only; current canonical artifact already has a PROVEN friendly-fire bug.


## Reduction Result

```text
Fresh artifacts verified: 8/8
Closed SAFE / no contradiction: 8
New PROVEN bugs: 0
Runtime-irreducible items: 0
Human tests required: 0
```

Authority: `docs/03-analysis/runtime-queue-reduction/pass-01.json`

## Handling a failure

```text
runtime observation
→ source cross-check
→ root cause / invariant
→ Claim-Based Proof
→ BUG / DESIGN MISMATCH / DEV NOTE
→ analogous-map search
→ regression corpus
```
