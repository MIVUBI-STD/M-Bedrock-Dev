---
id: document.analysis.developer-note-coverage
class: DOCUMENT
domain: analysis
role: CONTRACT
authority: CANONICAL
lifecycle: ACTIVE
---

# Developer Note Coverage

## Purpose

Developer Notes capture concrete engineering/release work that is useful to a developer but is not justified as a player-facing BUG or DESIGN_MISMATCH.

DEV NOTE is not a lower-confidence bug bucket and must never absorb generic NEED_VALIDATION.

## Admission Gate

A DEV NOTE is publishable only when all are true:

```text
Concrete selected-artifact evidence
+ clear engineering/release consequence
+ specific affected scope
+ actionable correction
+ not already represented by a BUG/DESIGN_MISMATCH root cause
+ no speculative language required
= DEV NOTE
```

Reject:
- style preference;
- generic best practice;
- hypothetical future risk with no selected-artifact evidence;
- broad refactor suggestion;
- missing runtime proof for a gameplay contradiction;
- duplicate symptom of an existing gameplay finding.

## Naming

User-facing title must describe the concrete condition in plain language.

Good:
- Version Name Is Inconsistent
- Debug Service Is Still Included in Release
- Arena Configuration Is Defined but Never Used
- Cleanup Has Two Competing Owners
- Persistent State Has No Release Path
- Error Is Swallowed Without Diagnostic Context

Avoid framework labels such as:
- authority drift;
- lifecycle anomaly;
- hygiene concern;
- architectural smell.

The technical category remains metadata; the title stays developer-readable.

## Coverage Matrix

Every selected artifact is routed through the applicable categories below.

### 1. Release & Artifact Identity

Check:
- registry version vs delivered filename;
- BP/RP/world release identity when it is release-bearing;
- stale/duplicate/foreign pack included in selected artifact;
- manifest dependency identity/version mismatch;
- development/test artifact accidentally delivered;
- ambiguous current artifact naming.

DEV NOTE when inconsistency is concrete but no player-visible behavior is proven.

Promote to BUG/DESIGN_MISMATCH when wrong identity changes loading, dependency resolution, content selection, or presented capability.

### 2. Production Developer / Debug Residue

Check:
- debug/test services initialized in release;
- temporary imports;
- diagnostic items/commands/events;
- coordinate pickers;
- skip/retry/restart tools;
- developer UI or chat output;
- debug flags left enabled.

If ordinary players can acquire/activate it and gameplay changes, use BUG/DESIGN_MISMATCH.
If residue is concretely shipped but unreachable to ordinary players, use DEV NOTE.

### 3. Configuration Integrity

Check:
- config declared but never consumed;
- duplicated configuration authorities;
- contradictory values for same behavior;
- fallback silently overriding authored config;
- obsolete config retained after implementation changed;
- per-level/per-arena config with no runtime owner.

DEV NOTE requires exact declaration + consumer/absence proof.
Gameplay consequence promotes it to BUG/DESIGN_MISMATCH.

### 4. Ownership & Lifecycle Maintainability

Check:
- multiple lifecycle owners for same mutable resource;
- writer/clearer with no authoritative owner;
- acquire/create without release path;
- cleanup ownership split across unrelated services;
- deferred work lacking generation/revision ownership;
- persistence with no explicit restore/reset/release contract.

DEV NOTE only when the ownership defect is concrete but no reachable player consequence is proven.
If it produces stale state, cross-arena mutation, race, or replay failure, use BUG.

### 5. Persistence / Saved-State Engineering

Check:
- scoreboard/tag/property persisted without documented lifecycle;
- stale keys no longer consumed;
- saved data grows without bounded cleanup;
- schema/key migration residue;
- active-session recovery data with no canonical reader;
- world/player persistent state with inconsistent reset ownership.

Do not call normal intentional persistence a note.

### 6. World / Structure / Content Integrity

Check:
- unused or orphaned structures/entities/functions;
- referenced content that exists only as stale duplicate;
- structure/world residue outside gameplay restore footprint;
- incomplete replica/content where consequence is not yet player-visible;
- mismatched structure identifiers;
- content included but unreachable from current gameplay.

Replica divergence with proven playable-space consequence is DESIGN_MISMATCH/BUG, not DEV NOTE.

### 7. Residency / Resource Engineering

Check:
- ticking-area declarations with no consumer;
- leases/reservations not released;
- resource budget materially inconsistent with authored topology but not player-visible;
- excessive persistent residency;
- entity/timer/subscription resources with concrete unbounded lifecycle;
- per-arena resource multiplication that creates engineering headroom risk.

Do not emit generic performance advice. Require arithmetic, ownership, or lifecycle evidence.

### 8. Scheduler / Deferred Work Engineering

Check:
- recurring intervals/subscriptions without terminal disposal;
- callbacks survive owner lifecycle without generation guard;
- duplicate scheduler ownership;
- fire-and-forget async work with no error/ownership handling;
- retry queues with abandoned work;
- timers that can accumulate across repeated runs.

Reachable state corruption/race becomes BUG.

### 9. Error Handling & Observability

Check:
- caught error silently discarded at a material boundary;
- generic catch converts actionable failure into ambiguous state;
- critical recovery path has no map/arena/player context;
- command/API failure ignored where developer needs exact diagnosis;
- failure path leaves no evidence for QA.

Do not demand logging everywhere. Only material gameplay/recovery/release boundaries qualify.

### 10. Player-Facing Information / Diagnostic Quality

Check:
- developer-only diagnostic text shown in production but not gameplay-breaking;
- stale version/build labels;
- misleading internal status text useful for QA cleanup;
- debug scoreboard/sidebar residue;
- temporary instructional text left in release.

If the information causes wrong player decisions or contradicts gameplay state, classify as DESIGN_MISMATCH/BUG instead.

### 11. Capability / Permission Engineering

Check:
- developer/admin surface relies on implicit reachability rather than explicit permission;
- permission checks duplicated/inconsistent;
- capability is gated in one entry path but not another;
- privileged action has no single permission owner.

Ordinary-player reachable gameplay mutation is BUG/DESIGN_MISMATCH.
Concrete privilege architecture weakness without reachable exploitation may be DEV NOTE.

### 12. Cross-Arena / Cross-Player Scope Engineering

Check:
- global selector used inside local service but blocked before consequence;
- global tags/properties used for local identity;
- world-global cleanup helper reused by arena-local systems;
- scope is broader than owner contract even if current callers avoid collision.

A reachable cross-owner mutation is BUG.

### 13. Inventory / Economy Engineering

Check:
- duplicated item cleanup/grant authorities;
- legacy kit/item identifiers retained;
- transaction helper can debit/credit through multiple inconsistent owners;
- refund/rollback implementation duplicated;
- stale shop/upgrade definitions unreachable from current gameplay.

Actual loss/duplication/wrong loadout is BUG.

### 14. Reset / Replay Engineering

Check:
- reset implementation has duplicated authorities;
- reset footprint contains concrete unexplained residue that current gameplay does not reach;
- old reset implementation remains shipped but unused;
- second-run initialization has redundant/conflicting writers with current blocking guards.

Reachable second-run corruption is BUG.

### 15. Dead / Stale Production Content

Check:
- unreachable production scripts/functions/entities/structures;
- old level implementation still packaged beside current implementation;
- unused imports/services;
- compatibility shims with no current consumer;
- abandoned feature flags/config.

Require reachability/consumer proof. File age or naming alone is insufficient.

### 16. Dependency / API Compatibility

Check:
- manifest/module dependency versions inconsistent;
- deprecated API usage concretely present;
- unsupported experiment/Education dependency;
- pack UUID continuity issue;
- release depends on a compatibility fallback.

Only report when selected artifact proves the condition and developer action is clear.

### 17. World Release State

Check applicable native/world metadata:
- experiments;
- Education settings;
- permissions/default game mode;
- cheats/commands requirements;
- last-opened/runtime identity when release-significant;
- pack activation order;
- release-only world settings inconsistent with authored behavior.

Gameplay failure is BUG; release cleanup without player consequence is DEV NOTE.

### 18. Testability & Developer Operations

Check:
- developer commands/tools use inconsistent names or permissions;
- required diagnostic control is present but cannot target arena/player safely;
- test tool mutates production state without cleanup;
- multiple developer controls perform the same operation through different owners;
- QA affordance is materially misleading.

Do not request new tooling merely because it would be convenient.

## Mandatory DEV NOTE Discovery Flow

```text
Selected Artifact
→ material engineering surfaces from existing Coverage Ledger
→ DEV NOTE category routing
→ evidence + owner/consumer/lifecycle analysis
→ gameplay finding dedup check
→ Admission Gate
→ root-cause deduplication
→ Developer Notes
```

Do not run a second independent scanner. Reuse the existing discovery/state/ownership/reference/replica/resource evidence.

## Closure Ledger

For every applicable category per map record:

```text
Category
Applicable?
Evidence reviewed
Concrete engineering condition?
Already BUG/DESIGN_MISMATCH?
DEV NOTE ID or SAFE
Exact unresolved evidence, if any
```

A map's Developer Note pass closes only when every applicable category is accounted.

## Canonical ledger

Current Developer Note state is persisted separately from Bug Report V2 at:

```text
workspace/developer-notes.json
```

Do not store Developer Notes inside `workspace/reports/` or use them as gameplay issue authority.

## Report Contract

Developer Notes:
- are displayed separately from BUG and DESIGN_MISMATCH;
- do not carry gameplay severity;
- do not inflate gameplay issue totals;
- have ID, title, problem, developer impact, evidence, affected scope, action;
- may optionally carry category metadata;
- are grouped under the affected map/level;
- are included in complete JSON/HTML exports.

Summary must show:

```text
Gameplay / Design Findings
BUG
DESIGN MISMATCH
DEV NOTES
Total Actionable Items
```

## Promotion Rules

```text
DEV NOTE + proven player-visible broken behavior
→ BUG

DEV NOTE + proven implementation vs authored/presented capability mismatch
→ DESIGN_MISMATCH

suspected gameplay problem with missing proof
→ exact verification obligation, NOT DEV NOTE
```

## Anti-Slop Gate

Reject a note when its action is merely:
- refactor;
- improve code quality;
- add tests;
- add logging;
- optimize;
- clean up;
- document better;

unless the selected artifact proves a concrete condition and the action names the exact owner/surface that must change.