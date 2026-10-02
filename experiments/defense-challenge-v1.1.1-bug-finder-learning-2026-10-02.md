# Defense Challenge v1.1.1 — Bug Finder Audit Learning Record

**Date:** 2026-10-02  
**Branch:** Local  
**Lane:** Experimental / detection-quality learning  
**Status:** Non-authoritative research record  
**Selected artifact:** `Defense Challenge v1.1.1.mcworld`

> Complete retrospective of the Defense audit. This is learning evidence for improving detection quality, not gameplay authority, canonical Bug Report V2 state, or runtime proof.

## 1. Purpose

This audit exposed a material bug-finder weakness: the first pass understood many source surfaces but missed a high-impact capacity defect. Defense contains six independent arenas, yet runtime admits only two concurrent arenas through `MAX_CONCURRENT_ARENAS = 2`.

The initial mistake was:

```text
queue exists + hard cap exists
→ assume cap is designed
```

Correct reasoning is:

```text
visible/physical capability
→ implemented capability
→ runtime/platform capability
→ challenge every unexplained reduction
```

A queue explains enforcement; it is not independent design-intent proof.

## 2. Scope and authority

Current gameplay conclusions were derived from the selected v1.1.1 world only. Changelog, Technical Docs, Development/Source, older versions, and other maps were not current gameplay authority.

Relevant repository contracts already required:
- Design Intent Challenge;
- physical vs concurrent capacity comparison;
- silent-degradation analysis;
- capacity + 1;
- performance-dependent gameplay analysis;
- temporal/cross-system analysis;
- mechanic completeness;
- negative-space analysis;
- counter-evidence before promotion.

Therefore this case is primarily an execution-quality failure, not simply a missing-rule failure.

## 3. Reconstructed game design

Defense is a 15-level defense marathon:

```text
Lobby → Join Arena → Party → Ready → Admission/Ticking Lease
→ Countdown → Preload → Build/Buy → Combat/Waves
→ Level Result → Shop/Transition → Next Level
→ Level 15 → Victory/Defeat → Result → Cleanup → Lobby → Reuse
```

Stage topology:

```text
L1–3   North
L4–6   North + East
L7–9   North + East + West
L10–15 North + East + South + West
```

Reset checkpoints: `1 / 4 / 8 / 12`. Intermediate levels preserve applicable defense state.

The world defines six independent arena configurations/party identities. Current runtime concurrency is two.

## 4. Capacity/platform finding

### Confirmed gameplay contradiction

```text
6 independent arenas
→ only 2 active leases allowed
→ 4 available arenas become queued/unusable while two sessions run
```

Current architecture uses three ticking areas per active arena. A naive whole-arena ticking area is not a valid assumed repair: the full Defense arena is approximately 165 chunks, above the relevant 100-chunk area constraint discussed for the target Education Edition environment.

Repair directions to evaluate later:
1. smaller NPC-zone ticking areas;
2. level/direction-aware ticking reservation;
3. tick_world anchor entities, verified in Education Edition.

Do not reduce this to changing `2 → 6`.

### Detection lesson

Always compare:

```text
Declared / Visible Capability
Implemented Capability
Runtime / Platform Capability
```

Investigate every unexplained gap. Graceful fallback does not prove gameplay correctness.

## 5. Confirmed/static findings from the deeper pass

### A. Multi-arena capacity degradation

Six independent arena surfaces are reduced to two simultaneous sessions by runtime resource architecture. This is the primary regression case for silent degradation.

### B. Disconnect can prevent team-wipe detection

Locked-party membership is preserved for reconnect, but wipe logic requires a recent death timestamp for every preserved member.

```text
A + B active
→ B disconnects
→ B remains in locked party
→ A dies
→ B has no recent death
→ wipe predicate returns false
```

Lesson: reconnect ownership and failure-condition semantics must be cross-audited.

### C. Configured full-level retry is not authoritative

Selected configuration declares `full_level_restart`, but runtime retry:
- preserves killed NPC IDs;
- selects the first incomplete wave;
- resumes remaining-NPC checkpoint behavior;
- also couples retry to bonus coins.

Lesson: declared mechanics/config must be traced through:
```text
Declared → Reachable → Triggered → Consumed → Effect → Player Result
```

### D. Spawn retry is outside wave-completion ownership

EntityLoader may schedule required enemy spawn retries while WaveScheduler/CombatTracker no longer count that retry as pending work.

Potential reachable sequence:

```text
required spawn fails
→ retry scheduled
→ delayed group decremented
→ no live tagged hostile
→ hostile-clear reconciliation
→ progression can resolve
→ retry may materialize enemy later
```

Lesson: deferred work that can materialize required gameplay must participate in completion gating.

### E. Reload recovery does not preserve pending wave timeline

Recovery stores wave position but not the remaining pending inter-wave timeout. Pending scheduling is rebuilt from indexes, changing temporal state after reload.

Lesson: persistence matrices must include timers/deferred-work state, not only logical indexes.

## 6. Retracted finding and counter-evidence lesson

An earlier pass claimed an arena could be immediately reused while reset was still running. A deeper read found additional protection:
- TickingAreaManager busy checker;
- `ResetMapService.isResetting(arenaId)`;
- non-idle session checks.

The simplified earlier claim was therefore not retained as confirmed.

Required discipline:

```text
candidate contradiction
→ actively search counter-evidence
→ inspect guards/owners
→ promote only after counter-evidence clears
```

Never preserve a bug because an earlier partial trace looked convincing.

## 7. Why the large Needs Validation pool was wrong

The audit temporarily conflated:
```text
coverage scenario ≠ bug candidate
```

Correct funnel:

```text
many gameplay surfaces inspected
→ smaller suspicious set
→ counter-evidence eliminates false positives
→ confirmed defects
→ small irreducible runtime residue
```

Tester workload must not become the detector's uncertainty backlog.

Static analysis should exhaust ownership, capacity, config consumption, selector scope, retry semantics, async ownership, timer persistence, reset/preserve rules, resource constraints and negative-space handlers before escalation.

Runtime residue should be limited to behavior fundamentally dependent on Minecraft simulation, such as voxel navigation, physical explosion results, real chunk timing under load, and Education Edition-specific runtime behavior.

## 8. Required first-pass workflow after this case

```text
01 Pin selected map/version
02 Discover gameplay surfaces
03 Close Discovery Closure
04 Reconstruct player-facing Game Design
05 Map full gameplay journey
06 Build state-transition model
07 Build reset/preserve/persistence matrix
08 Extract numeric/capability boundaries
09 Compare physical vs runtime capacity
10 Build multi-arena ownership graph
11 Build resource/platform constraint model
12 Build async/timer ownership graph
13 Build level/stage delta graph
14 Build entity lifecycle/completion graph
15 Build reconnect/reload/recovery graph
16 Build terminal-condition interaction graph
17 Run Design Intent Challenge
18 Run Mechanic Completeness
19 Run Negative-Space Analysis
20 Run Design Consistency Anomaly Analysis
21 Run Temporal/Cross-System Analysis
22 Search silent degradation/fallback masking
23 Search illegal composite states
24 Apply counter-evidence early
25 Consolidate semantic duplicates
26 Classify actual defects
27 Leave only irreducible runtime residue
28 Proposed Bug Set review
29 Approved Bug Set
30 Canonical Bug Report V2 / HTML
31 Repair only after approval
32 Verify defect removal + preservation
```

## 9. Silent-degradation requirement

Explicitly inspect:
- queue fallbacks;
- hard caps;
- disabled mechanics;
- reduced simulation;
- skipped replicas/content;
- reduced player counts;
- reduced concurrency;
- performance safeguards;
- fallback targeting;
- compatibility fallback.

Generic rule:

```text
technical constraint
→ workaround/fallback
→ game remains operational
→ player capability reduced
→ mandatory intent/capability challenge
```

Do not encode Defense-specific checks such as `if arenaCount == 6`. Use peer/outlier and capability-gap reasoning.

## 10. Illegal composite-state analysis

Model coexisting state dimensions:
- Session;
- Party;
- Arena;
- Ticking Lease;
- Reset;
- Level;
- Wave;
- Enemy Manifest;
- Flag;
- Player Life State;
- Async Work;
- Persistence/Recovery.

Search generically for contradictions such as:

```text
COMBAT + missing required simulation ownership
QUEUE + gameplay preload committed
IDLE + required hostile state alive
LEVEL N+1 + required callback from Level N pending
SESSION B + deferred mutation owned by Session A
VICTORY + retry callback eligible
DEFEAT + respawn callback eligible
WAVE COMPLETE + required spawn retry pending
```

## 11. Async/deferred ownership

Every deferred gameplay mutation should carry/revalidate enough ownership:
```text
Arena + Session/Generation + Level + Phase + Operation
```

High-risk operations:
- delayed spawn;
- spawn retry;
- countdown;
- respawn;
- retry;
- preload;
- reset;
- cleanup;
- lobby teleport;
- ticking creation/release;
- warning timers;
- reload recovery.

## 12. Level-delta reasoning

Do not audit 15 levels as unrelated copies. Audit material deltas:

```text
L3→L4   single→dual + reset
L6→L7   dual→triple
L7→L8   reset + 2-wave→3-wave architecture
L9→L10  three→four logical fronts + South split
L11→L12 reset
L12→L13 champion introduction
L14→L15 maximum load + delayed final content + final victory boundary
```

At each delta inspect spawn, path, target, resource/ticking requirement, reset, preserve, timer, wave, entity lifecycle, score/economy and cleanup.

## 13. Report/presentation learning

Canonical report facts and presentation must remain separate.

During this case HTML was initially rendered with the wrong checklist interpretation. The repository's actual client renderer is `tooling/bug-report-documents/render.ts`, while the user later requested a simpler internal bug-status checklist rather than a reproduction-guide checklist.

Lesson:
- inspect the most specific consumer/renderer before producing artifacts;
- do not infer UI intent from a generic layout;
- presentation-only checkboxes never become canonical bug state;
- experimental UI lessons do not redefine Bug Report V2.

## 14. Regression cases to preserve conceptually

These are generic regression scenarios, not map-specific production rules:

1. **Capacity outlier**
   - multiple peer arenas independently configured;
   - runtime concurrency is a strict unexplained subset;
   - queue/fallback exists;
   - detector must raise Design Intent Challenge.

2. **Recovery membership mismatch**
   - reconnect preserves participant ownership;
   - failure predicate assumes every preserved member is active;
   - detector must inspect cross-system semantics.

3. **Declared config not consumed**
   - mechanic mode declared;
   - runtime branch never reads it;
   - detector must flag incomplete mechanic chain.

4. **Deferred required work outside completion accounting**
   - required content retries asynchronously;
   - completion gate ignores retry;
   - detector must flag temporal ownership gap.

5. **Temporal persistence gap**
   - logical index persists;
   - remaining timer/deferred schedule does not;
   - detector must inspect recovery distortion.

6. **Counter-evidence regression**
   - apparent state race exists;
   - secondary guard/busy checker prevents reachability;
   - detector must suppress after counter-evidence.

## 15. Quality target for future bug finder runs

A strong audit should converge toward:

```text
large surface inventory
→ high static resolution
→ small suspicious set
→ aggressive counter-evidence
→ concise confirmed defect set
→ minimal runtime-only residue
```

Bad outcome:
```text
large surface inventory
→ large Needs Validation list
→ tester must rediscover bugs manually
```

Success means the detector reduces tester search time rather than transferring uncertainty to the tester.

## 16. Promotion boundary

This experiment must not become production authority wholesale.

Promote only minimal proven improvements into canonical owners, for example:
- audit procedure changes → map-audit skill/docs owner;
- generic detection reasoning → diagnostic/gameplay-intent packages;
- regression fixtures → appropriate eval/fixture owner;
- report rendering changes → bug-report/document renderer owner.

Any promotion requires its own scoped implementation and proof.

## 17. End-to-end operational principle

The Defense case establishes the desired discipline:

```text
Understand the game
→ understand maximum intended capability
→ understand implementation
→ understand platform/resource constraints
→ challenge every degradation
→ trace all state and deferred ownership
→ eliminate false positives with counter-evidence
→ report only real player-facing defects
→ keep runtime residue small
→ use the findings to improve generic detection, not encode one map's bugs
```

This is the primary learning record from Defense Challenge v1.1.1.
