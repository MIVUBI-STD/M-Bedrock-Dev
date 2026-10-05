# Attack Challenge v1.1.1 — Pre-Test Audit Workflow and Learning Record

> Experimental record only. Non-authoritative. Production behavior and canonical policy remain with their canonical owners.

## Purpose

Capture the complete method and system-learning from the 2026-10-02 pre-test audit of **Attack Challenge v1.1.1** so future M-Bedrock-Dev audits find gameplay defects with less manual testing, fewer false positives, and better closure discipline.

## Evidence boundary

- Repository: `MIVUBI-STD/M-Bedrock-Dev`
- Branch: `Local`
- Documentation-time HEAD: `05d10e9074bbd6c1b3dc1d8ce05f6419f0d8d3c5`
- Lane: `m-bedrock-map-bug-audit`
- Selected artifact: `Attack Challenge v1.1.1.mcworld`
- Drive file ID: `14JStk_EK0XlAyBTdPLyUE2lCKyk9BKpX`
- Observed artifact size: 24,434,197 bytes
- Mode: selected-map-version-only
- Repair: not performed

Current gameplay conclusions came from the selected v1.1.1 artifact. `Development/`, Technical Docs, changelog, historical QA, previous versions, and other maps were excluded as current gameplay authority.

Proof ceiling is static/package analysis. Nothing here implies `LIVE GAME VERIFIED`.

## Source correction

The first supplied secondary source was a Google Sheet. The user corrected it to the Drive root containing the actual current map hierarchy.

```text
secondary tracker
→ corrected Drive root
→ Challenge - Attack Map
→ Attack Challenge v1.1.1.mcworld
→ selected artifact pinned
→ stale/external gameplay intent excluded
```

Learning: artifact selection must precede gameplay reasoning. A tracker can describe project status but cannot silently become gameplay truth.

## Repository contracts loaded

The audit followed current repository owners instead of inventing a new process:

- root `AGENTS.md`;
- `GITHUB_RULES.md`;
- `.agents/skills/m-bedrock-map-bug-audit/SKILL.md`;
- Game Design Contract;
- Gameplay Flow Contract;
- Multi Arena Contract;
- Gameplay Model Closure;
- Gameplay Audit Blind Spots;
- Cross-System Interaction Audit;
- Hidden Gameplay Defect Analysis;
- Audit Finalization Checklist;
- Map Audit Output V2;
- Gameplay Bug Report V2 and HTML layout.

Canonical reasoning order:

```text
Selected Map Version
→ Gameplay Surface Inventory
→ Game Design Reconstruction
→ Gameplay Flow / State Model
→ Reset / Preserve / Progression
→ Multiplayer / Multi Arena / Capacity
→ Gameplay Model Closure
→ Contradiction Analysis
→ Counter-evidence
→ Consolidation
→ Classification / Report
```

## End-to-end work flow

### 1. Select one current artifact

Pin the current root `.mcworld`, its version, and the evidence boundary. Do not mix versions.

### 2. Discover surfaces before finding bugs

Inventory all player-visible or gameplay-consequential surfaces:

- lobby / join pads;
- party / ready / countdown;
- queue / capacity;
- ticking-area acquire/release;
- preload / cinematic positioning;
- arena reset;
- structures;
- Buy Phase;
- shop / economy / enchant;
- kits / inventory;
- combat;
- NPC spawn / tracking;
- flag spawn / pickup / drop / capture;
- death / respawn;
- retry;
- score / result;
- level progression;
- contraptions;
- TNT / build permissions;
- disconnect / reconnect;
- reload / recovery;
- victory / defeat;
- cleanup;
- second-run reuse;
- package/resource references.

### 3. Reconstruct the happy path

```text
World boot
→ static services/ticking
→ persisted-session recovery
→ Lobby
→ Join Arena
→ Party + Ready
→ Ticking Lease
→ Countdown
→ Party Lock
→ Preload
→ Reset
→ Structure Setup
→ Buy Phase
→ Player Setup
→ Active Level
→ Combat + Flag Objective
→ Success or Retry
→ Next Level
→ ...
→ Level 15
→ Result
→ Cleanup
→ Release Lease
→ Lobby
→ Arena Reuse
```

### 4. Reconstruct alternate/failure paths

Explicitly trace:

- death and delayed respawn;
- disconnect while dead;
- reconnect during active play;
- reload during active play;
- reload during pending respawn;
- reload around objective ownership;
- structure command failure;
- NPC spawn retry exhaustion;
- flag spawn retry exhaustion;
- UI crossing a phase boundary;
- victory while enemies remain alive;
- retry with preserved enemy-death state;
- cleanup and second run;
- two active arenas plus queued arenas.

This phase produced more value than another happy-path pass.

### 5. Reconstruct multi-arena ownership

The selected map exposes six physical arena replicas. Static inspection found per-arena ownership for:

- coordinate offset;
- party identity;
- session state;
- flag coordinates/state routing;
- entity tags;
- score identity;
- structures;
- reset/cleanup bounds;
- contraption projection;
- ticking-area names.

Important distinction:

```text
physical arenas = 6
concurrent active limit = 2
```

The 2-of-6 limit was challenged, not automatically classified. It was removed from the bug set because the selected implementation owns static ticking regions plus three dynamic regions per active arena, making the two-active admission model consistent with its platform resource model.

Learning: physical replica count is not concurrency intent.

### 6. Reconstruct all 15 stages

| Level | Time | Buy | NPC | Added complexity |
|---:|---:|---:|---:|---|
| 1 | 150s | 25s | 4 | basic flag push |
| 2 | 150s | 25s | 8 | patrol escalation |
| 3 | 150s | 25s | 10 | first wall |
| 4 | 180s | 24s | 12 | double wall |
| 5 | 180s | 24s | 14 | shield pressure |
| 6 | 180s | 23s | 18 | ranged pressure |
| 7 | 210s | 23s | 22 | garrison |
| 8 | 210s | 22s | 22 | iron line |
| 9 | 210s | 22s | 25 | crossfire |
| 10 | 240s | 22s | 28 | veteran front |
| 11 | 240s | 21s | 32 | sealed gate + button |
| 12 | 240s | 21s | 38 | elite core + button |
| 13 | 270s | 21s | 44 | temporary-button interaction |
| 14 | 300s | 20s | 50 | final-defense interaction |
| 15 | 300s | 20s | 58 | lever groups + final button + multi-door chain |

Levels 1–10 mostly reuse the structure/combat/flag core. Levels 11–15 add interaction-state complexity. Shared root defects were reported once rather than duplicated per level.

### 7. Analyze ticking areas as ownership, not as a keyword

Separate:

1. static ticking ownership;
2. dynamic per-arena lease ownership;
3. logical concurrency capacity;
4. physical ticking commands;
5. stale cleanup/recovery;
6. chunk/structure coverage.

Potential ticking races were retained as engineering/runtime residue when player-visible failure could not be proven statically. This prevented capacity concerns from becoming false gameplay bugs.

### 8. Analyze cross-system intersections

High-value intersections used:

- Death × Reconnect;
- Death × Reload;
- Reload × Scoring;
- Shop/UI × Combat Start;
- Victory × Entity Lifecycle;
- Structure Setup × Level Transition;
- TNT × Arena Protection;
- Spawn Retry × Objective Integrity;
- Spawn Retry × Encounter Integrity;
- Multi Arena × Ticking Capacity;
- Retry × Preserved Enemy State × Contraption Reset.

### 9. Generate a wide candidate pool internally

The first pass intentionally favored recall. Candidates included concurrency, ticking races, chunk coverage, developer events, cross-arena interaction, retry persistence, retry economy, flag reload state, and repeated ticking setup.

This wide set was **not** suitable for user-facing publication.

### 10. Apply counter-evidence and consolidation

For every candidate:

- Is expected behavior independently grounded?
- Is there a player-visible consequence?
- Does another handler recover it?
- Is it a platform constraint instead of a defect?
- Is it the same root cause as another finding?
- Can the gameplay consequence be derived without inventing runtime behavior?
- Is it only suspicious implementation?

Candidates failing these gates were rejected, de-escalated, or kept only as runtime residue.

### 11. Project the final report

Final consolidated set: **12 findings — 2 Blocker, 8 Major, 2 Minor**.

HTML projection followed repository presentation rules:

```text
Overview / metrics
→ Issue Dashboard
→ Severity Guide
→ Confirmed Bug Cards
→ Tester Checklist
→ Observed / Expected
→ Recommended Resolution
→ Work Checklist
→ Technical Detail
→ Scope / Version
```

## What went wrong during the audit process

### Too much early “test this” language

The audit initially projected many static risks into manual test scenarios. The user correctly rejected this because the system is supposed to **reduce** tester search effort.

Correction:

```text
risk
≠ bug
≠ request for tester to explore
```

The system should first exhaust deterministic artifact reasoning, then hand off only irreducible runtime residue.

### Candidate lists were exposed too early

A broad candidate pool is useful internally, but presenting it before consolidation creates noise and makes later removals look like inconsistency.

Correction: keep wide recall internal until counter-evidence, intent challenge, deduplication, and root-cause consolidation finish.

### “Full check” must mean coverage closure, not endless rescanning

Repeated passes are not a substitute for a stable surface inventory. Future audits should create the surface ledger first, then close every surface exactly once as understood, blocked, unknown, or not-applicable.

## Detection improvements derived from this audit

1. **Commit-time phase validation detector**  
   Flag UI/form actions whose commit handler does not revalidate current session/phase ownership.

2. **Deferred-work stale-state detector**  
   For delayed callbacks, verify that player/session/arena state is revalidated before mutation.

3. **Failure-propagation detector**  
   Trace async setup failures through catch/return-null behavior and identify callers that interpret failure as completion.

4. **Required-objective integrity detector**  
   A required win-condition producer that can permanently fail must have recovery/abort ownership.

5. **Encounter integrity detector**  
   Exhausted required spawn retries must not silently degrade a configured encounter without explicit design.

6. **Persistence closure matrix**  
   Compare persisted session state against all in-memory state needed to reconstruct active gameplay after reload.

7. **Terminal-transition atomicity detector**  
   Check whether combat actors, damage authority, score authority, objective authority, and cleanup cross the terminal state together.

8. **Same-event competing-owner detector**  
   Detect multiple event subscribers that mutate the same world action at different timing, as seen with TNT placement.

9. **Replica-count vs concurrency-intent discipline**  
   Never infer that all physical arenas are intended to run simultaneously.

10. **Shared-root per-level deduplication**  
    Do not create one issue per stage when one systemic transition/spawn defect affects all stages.

## Recommended future audit execution

```text
PIN artifact
→ raw surface discovery
→ Discovery Closure
→ gameplay/state model
→ boundary/capacity extraction
→ cross-system matrix
→ hidden-defect modules
→ wide internal candidate set
→ counter-evidence
→ root-cause consolidation
→ proof-ceiling classification
→ compact user report
→ runtime residue only when irreducible
```

The primary quality metric is not “number of bugs found”. It is:

```text
high recall before consolidation
+
low false-positive publication
+
complete surface accounting
+
minimal tester search work
```
