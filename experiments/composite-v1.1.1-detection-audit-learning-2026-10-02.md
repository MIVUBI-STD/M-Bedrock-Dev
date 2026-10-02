# Composite Challenge v1.1.1 — Detection Audit Learning Record

Date: 2026-10-02
Scope: Experimental, non-authoritative
Target: Challenge - Composite Map(1).zip → Composite Challenge v1.1.1
Branch: Local

> This is a detection-learning record, not canonical Bug Report V2, repair approval, or runtime proof.

## Purpose

The first Composite audit was too test-oriented. It produced broad test scenarios instead of first extracting defects already provable from the selected artifact. The key miss was ticking coverage: every arena declares two ticking regions; Defense NPCs can spawn/path roughly 110–120 blocks from students; the Composite arena lifecycle never creates those arena ticking areas; bootstrap creates global lobby/permission coverage instead. Therefore distant NPC simulation has no matching guaranteed runtime owner.

Corrected rule:

```
selected artifact
→ gameplay dependency
→ required runtime owner
→ prove owner exists / missing
→ player-visible failure mode
→ one narrow tester confirmation
```

Testing confirms manifestation; it is not the primary discovery engine.

## Authority / proof

Composite Challenge v1.1.1 is the sole current gameplay authority. Older versions, historical QA, other maps and external docs cannot define expected behavior.

Labels:
- SOURCE-GROUNDED: contradiction exists in selected artifact/source.
- PLAYER-CONFIRMABLE: concrete player-visible trigger exists.
- LIVE-BLOCKED: exact manifestation needs Minecraft/server execution.
- NOT ADMITTED: counter-evidence or insufficient contradiction.
- AMBIGUOUS: intent/impact not grounded enough.

Lane: m-bedrock-map-bug-audit; INSPECT + DIAGNOSE; no map mutation; no repair; no canonical publication before approval.

## Workflow performed

1. Isolated Composite v1.1.1.
2. Inventoried onboarding, join pads, fixed arena mapping, Ready, countdown, six arenas, Attack, Defense, preload, preparation, timer, waves, NPC pathing, ticking, flag, death/respawn, wipe, retry, vote, completion, transition, final result, score/reward, cleanup, reconnect, reload, reuse, delayed callbacks, entity cleanup, block mutation, feedback, structures and result export.
3. Reconstructed flow:
```
join → onboarding → fixed join pad/team/arena → Ready → countdown → lock
→ preload Attack+Defense → preparation → gameplay
→ Defense wave + Attack/flag objective
→ death/respawn/wipe → completion or failure → retry/next level
→ final result → cleanup → lobby → reuse
```
4. Reconstructed state/resource ownership.
5. Audited multi-arena selectors and mutations.
6. Audited temporal/deferred work.
7. Audited reconnect/offline semantics.
8. Audited reload snapshot completeness.
9. Audited Level 1–15 structure references and progression dependencies.
10. Cleared counter-evidence before retaining candidates.
11. Converted retained findings into player-visible tester triggers.
12. Kept rejected/ambiguous candidates separately.

## Corrected detection model

For every mechanic:
```
declared → prerequisite → runtime owner → activation → mutation
→ consumer → terminal/reset owner → player-visible result
```

For multi-arena:
```
state owner?
ownership selector/bounds?
can A cleanup reach B?
can deferred work outlive session?
can world state override arena state?
```

For simulation:
```
where must entities simulate?
what guarantees ticking?
who acquires it?
who releases it?
does declared config become runtime state?
```

# Active source-grounded findings

## C-01 — Arena ticking coverage declared but never created
Severity: Blocker candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Defense wave → remote NPC spawn/path → NPC must simulate → chunk must tick → arena coverage required → declared coverage exists → lifecycle never creates it.

Player symptom: a team stays at base; NPCs may arrive late, freeze, or never reach base unless a student approaches.

Detection miss: initial analysis failed to join ticking config + creation + spawn distance + progression dependency.

Repair constraint: blindly creating all 12 declared regions is not automatically valid for six arenas; repair must respect simulation budget.

## C-02 — Cross-arena flag-carrier cleanup
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Arena A cleanup removes Composite flag-carrier state globally, allowing Arena B carrier/objective state to change.

## C-03 — Cross-arena dropped-item deletion
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Structure loading performs dimension-wide dropped-item cleanup without arena ownership/bounds.

## C-04 — Floor maintenance uses unrelated players as anchors
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Arena maintenance executes around all players and can mutate blocks around unrelated players.

## C-05 — Reconnect has competing Attack and Defense owners
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Both subsystems can process the same Composite reconnect and set position/loadout/respawn/state. Normal death is not the same: Attack has a Composite guard there.

## C-06 — Exit vote threshold can become stale after disconnect
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

A+B → A votes 1/2 → B disconnects → requirement becomes 1 → A invokes Exit → duplicate-vote return occurs before threshold re-evaluation.

## C-07 — Offline locked member can prevent team wipe
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Reconnect reservation remains party membership; wipe evaluation can count the offline member and suppress normal wipe/retry.

## C-08 — Offline player can miss terminal cleanup
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

End cleanup operates on currently online players; session/party can reset before the offline member returns.

## C-09 — Delayed lobby teleport can outlive its session
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Old terminal callback retains a player reference and does not revalidate new session ownership before teleport.

## C-10 — Pending respawn is not preserved by recovery
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Recovery persists death history but not pending respawn state.

## C-11 — Cross-arena flag audio cleanup
Severity: Minor candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Flag sound cleanup includes players outside the owning arena.

## C-12 — Arena abort/system message can leak globally
Severity: Minor candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Scoped recipient resolution can fall back to world broadcast after ownership is cleared.

## C-13 — Game Results version metadata stale
Severity: Minor candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Artifact is v1.1.1; result adapter identifies v1.1.0.

## C-14 — Timeout may terminate one scheduler interval late
Severity: Minor candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

Expiry is checked before decrement on a 20-tick interval.

## C-15 — Welcome delayed clear can remove Ready
Severity: Major candidate
Status: SOURCE-GROUNDED / PLAYER-CONFIRMABLE

fresh join → delayed welcome clear → player enters Composite pad → Ready granted → old clear fires → Ready removed.

# Investigated but not admitted

## R-01 — Vote state persists into next match
Not admitted after recheck. Vote pruning removes ineligible voters and clears empty state. Valid vote defect remains C-06.
Lesson: search lazy pruning/consumer cleanup before calling persistence.

## R-02 — Dynamic allocator assigns two parties to one arena
Not applicable. Composite uses fixed join-pad/team-to-arena mapping.

## R-03 — Missing Level 1–15 structures
Not found statically. Referenced pit/castle structures inspected were present.
Lesson: asset existence does not prove gameplay viability.

## R-04 — Attack and Defense both process normal death
Not admitted. Attack normal-death path has a Composite guard. Reconnect remains C-05.

## R-05 — Victory and timeout double-complete
Not found in obvious static path. Completion/status guards protect normal terminal transition.

## R-06 — Arena 1–6 coordinate mismatch/overlap
Not found statically. Template/offset generation inspected was consistent.

## R-07 — All-player disconnect permanently locks arena
Not established. Timers/retry still provide autonomous terminal paths.

## R-08 — Shared spectator location is automatically a bug
Ambiguous. Promote only if spectators interfere with another arena or cannot recover.

## R-09 — Developer commands are exposed
Not established. Capability existence is not ordinary-player reachability.
Correct chain: ordinary player → reachable prerequisite → trigger → restricted capability → missing authorization → impact.

## R-10 — Global XP-orb cleanup affects Composite
Call-path not established. Related Defense logic exists, but selected Composite execution path was not proven.

## R-11 — Disconnected-player reward scaling is wrong
Intent unresolved. Online-player count affects reward processing, but disconnected-member entitlement is not grounded enough.

# Multi-arena closure

Checked with active defect:
- ticking/simulation → C-01
- flag isolation → C-02
- dropped items → C-03
- block mutation → C-04
- reconnect → C-05
- disconnect × vote → C-06
- disconnect × wipe → C-07
- offline terminal cleanup → C-08
- reuse × delayed callback → C-09
- audio isolation → C-11
- message isolation → C-12

Checked without admitted defect:
- dynamic allocation: not applicable
- fixed Arena 1–6 mapping
- obvious replica coordinate generation
- referenced structure existence
- normal-death double owner
- obvious victory/timeout duplicate transition
- permanent orphan after all-player disconnect

Narrow live confirmations still required only for manifestation: C-01 NPC behavior, C-02 flag result, C-05 reconnect final state, C-10 reload/respawn result, C-14 exact timer delay.

# Per-level lesson

“All 15 structures exist” is not level coverage.

Required chain:
```
level config → structure load → player position → enemy spawn → route/path
→ ticking coverage → target acquisition → wave completion
→ flag/objective prerequisite → completion trigger → reward/score
→ cleanup → transition
```

# Tester-facing proof design

The first HTML was too technical. Correct projection:

```
Setup
→ How to Reproduce
→ Bug Is Proven When
→ Expected
→ Bug reproduced / Not reproduced / Blocked
→ Tester note/evidence
```

Tester must never need code, tags, variables, source files or architecture. Final reproduction step must end in a visible wrong result. Technical cause is supporting/collapsible information. Rejected/ambiguous findings stay separate so a tester can overturn AI judgment.

# What failed in the initial audit

1. **Test-matrix substitution** — broad tests replaced source diagnosis.
2. **Function-local analysis** — ticking config, creation, geometry and progression were not joined.
3. **Premature completeness** — file sweep was mistaken for gameplay closure.
4. **Speculative candidates** — temporal risks were published before counter-evidence.
5. **Tester-unfriendly HTML** — audit structure was exposed instead of field workflow.

# Detection gaps exposed

## DG-01 — Declared runtime resource without lifecycle realization
Generic chain: declared requirement → runtime acquisition → consumer → release.

## DG-02 — Simulation-distance dependency reasoning
Correlate player position, entity spawn, route geometry, ticking coverage and progression. Never hard-code Composite or 110 blocks.

## DG-03 — Cross-arena global selector ownership
arena-scoped lifecycle + global selector/world mutation + no ownership filter → isolation candidate.

## DG-04 — Temporal ownership / stale deferred work
callback scheduled under owner revision A → owner changes to B → callback commits without revalidation → stale-work candidate.

## DG-05 — Reconnect authority collision
Detect multiple systems restoring the same player/session state and compare guards/ownership.

## DG-06 — Offline membership semantics
Distinguish party member, active participant, reconnect reservation, alive participant, reward participant and vote participant.

## DG-07 — Recovery snapshot completeness
For every material transient state: can be active at reload? snapshot? restore? pending callback? equivalent state?

## DG-08 — Onboarding-to-gameplay ownership handoff
Delayed onboarding work must not mutate inventory/state after gameplay ownership begins.

# Reusable audit algorithm

1. Select one current map/version.
2. Inventory gameplay surfaces.
3. Reconstruct player journey and state machines.
4. Build mechanic dependency chains.
5. Build resource-lifecycle chains.
6. Build multiplayer ownership sets.
7. Inventory multi-arena selectors/mutations.
8. Inventory deferred work.
9. Build reload snapshot matrix.
10. Build per-level progression chains.
11. Challenge missing links.
12. Clear counter-evidence.
13. Retain source-grounded contradictions.
14. Derive one narrow player-visible confirmation per finding.
15. Preserve rejected/ambiguous findings separately.
16. Generate tester-first HTML.
17. After chat approval only, promote approved bugs to Bug Report V2.

# Anti-patterns

Do not:
- equate runtime confirmation with discovery;
- ask testers to inspect implementation;
- use old versions as current intent;
- encode map/object-specific detector rules;
- treat every global selector as a bug without scoped ownership;
- infer persistence before searching lazy cleanup;
- assume dynamic allocation;
- equate structure existence with gameplay completeness;
- claim full audit because files were parsed.

# Improvement acceptance criteria

Future detection should:
- connect prerequisites across files/owners;
- identify declared-but-unrealized resources;
- reason about simulation coverage from spatial facts;
- identify global mutation inside arena lifecycle;
- detect stale callbacks after ownership changes;
- distinguish offline/reconnect roles;
- compare recovery snapshots with transient state;
- produce player-visible tester triggers;
- retain rejected candidates/reasons without polluting primary bugs.

# Generic regression fixtures to derive later

1. Declared simulation resource with missing acquisition.
2. Arena cleanup using global selector that reaches another session.
3. Deferred callback committing after ownership revision.
4. Two recovery owners restoring one player.
5. Offline reservation incorrectly treated as alive/voting/reward participant.
6. Recovery snapshot missing a transient state.
7. Delayed onboarding mutation after gameplay ownership.
8. Result metadata diverging from selected artifact version.

These fixtures must stay abstract. Known Composite bugs are examples, not production detector rules.

# STOP / current experiment state

This experiment records the complete learning from the Composite v1.1.1 audit to date:
- workflow from target isolation through tester projection;
- active source-grounded findings C-01..C-15;
- rejected/ambiguous findings R-01..R-11;
- multi-arena closure status;
- per-level/ticking lesson;
- detection gaps;
- reusable algorithm;
- anti-patterns;
- future regression fixtures.

No map repair is authorized by this document. No finding becomes canonical merely by appearing here. Promotion requires explicit review and movement of the minimal proven detection idea into its canonical owner.
