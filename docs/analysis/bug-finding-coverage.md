# Bug-Finding Coverage System

## Purpose

This is the canonical coverage owner for selected-map bug finding.

The production flow remains:

```text
TARGET → DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE → REPORT
```

This document ensures material gameplay surfaces, reusable knowledge, detectors, reliability evidence, boundary checks, and unresolved residue cannot silently disappear from the audit.

## Coverage layers

Every audit closes five cumulative layers:

1. **Surface accounting** — every material discovered surface has purpose, owner, route, proof state, and final disposition.
2. **Player-flow coverage** — checks attach to ENTRY/JOIN → READY/START → SETUP → ACTIVE → PROGRESSION → TERMINAL → CLEANUP/REPLAY → RECOVERY.
3. **Vital-domain coverage** — entry/admission, progression, multi-arena isolation, connection/recovery, inventory/player capability, world/reset integrity, score/result integrity, and player-facing information.
4. **Cross-system and boundary stress** — lifecycle intersections, concurrency, maximum+1, retry/reconnect/reload, deferred work, cleanup/reuse, and negative-space inverse checks.
5. **Proof and conservation closure** — every contradiction or residue ends as a finding, explicit Audit Obligation, safe/not-applicable disposition, or counter-proof rejection.

No layer replaces another.

## Evidence roles

The selected artifact is the only current gameplay authority.

- Engine analyzers and semantic models derive evidence from it.
- Platform knowledge/rules may support a claim only when applicable to the selected runtime profile.
- Reliability regressions and failure patterns raise search priority and detector recall; they never prove a current defect by themselves.
- User/client feedback raises scenario priority; it never creates a finding by itself.
- Runtime verification resolves only irreducible behavior.
- Old versions and archived reports are historical search hints only.

## Surface accounting

Every material surface must record:

```text
Surface ID
Source / Evidence
Gameplay Purpose
Gameplay Owner
Lifecycle Owner
Mutable Resources
Player-Flow Stage
Vital Domain(s)
Applicable Checks
Required Crosschecks
Proof State
Finding / Audit Obligation / Safe Disposition
Closure
```

Allowed terminal closure:

```text
SAFE
PROVEN
NEED_VALIDATION
AUDIT_OBLIGATION
NOT_APPLICABLE
```

`NOT_APPLICABLE` requires positive selected-artifact evidence.

Block closure when a material surface has no purpose, no owner, no route, unresolved mutable state, missing required crosschecks, or unresolved evidence absent from findings and Audit Obligations.

## Discovery challenger

After normal discovery, challenge raw state/execution from the opposite direction:

```text
raw state / command / callback / selector / mutation
→ semantic owner?
→ gameplay purpose?
→ scenario?
→ lifecycle owner?
→ closure?
```

Orphan execution/state remains a Detection Gap until resolved.

## Player-flow coverage

For every applicable gameplay stage account for:

```text
entry condition
owner
required state/resources
player/system action
success condition
failure condition
next transition
cleanup
recovery
applicable technical checks
```

Technical domains are invoked where they affect gameplay; they are not separate audit branches.

## Vital-domain coverage

Project the canonical audit into exactly eight vital domains:

- `ENTRY_ADMISSION`
- `GAME_STATE_PROGRESSION`
- `MULTI_ARENA_ISOLATION`
- `CONNECTION_RECOVERY`
- `INVENTORY_PLAYER_CAPABILITY`
- `WORLD_RESET_INTEGRITY`
- `SCORE_RESULT_INTEGRITY`
- `PLAYER_FACING_INFORMATION`

For each applicable domain answer:

```text
source of truth
mutation owner
ownership-change boundary
interruption behavior
restore / clear / persist / preserve contract
```

Pressure each domain through happy path, failure path, disconnect/recovery, second run, concurrent interleaving, and boundary/capacity scenarios.

Vital Closure remains a read-only projection and never creates findings.

## Mandatory bug-finding families

Activate when applicable:

- capacity, admission, concurrency;
- multi-arena isolation and replica integrity;
- progression, waves, objective completion;
- terminal collisions and exactly-once result ownership;
- inventory, equipment, kit, shop, currency lifecycle;
- player capability and privileged-role exposure;
- gamerule/world-setting authority;
- entity lifecycle, combat, navigation, disappearance accounting;
- ticking/chunk residency and simulation readiness;
- world/structure/block/liquid mutation and reset footprint;
- client/server reconciliation for cancelled or rewritten mutations;
- persistence, disconnect, reconnect, reload, retry;
- cleanup, replay, second-run equivalence;
- UI, score, timer, queue, player-facing information;
- meaningful boundary values and maximum+1;
- deferred callbacks/subscriptions/timers and generation ownership;
- referential integrity and missing guard/capability/cleanup;
- platform/performance limits when they change playable behavior.

These are coverage families, not a manual test checklist.

## Mutable-state reverse index

For every material mutable resource build:

```text
Resource
→ Creator
→ Readers
→ Writers
→ Clearers
→ Deferred Writers
→ Owner
→ Generation / Revision
→ Persistence Scope
→ Cleanup Boundary
```

Challenge multiple writers without authority, global mutation of local state, deferred writers without generation validation, create/acquire without cleanup, mutation after owner invalidation, and persistent state without restore/reset ownership.

This reverse index selects higher-order interaction checks.

## Negative-space coverage

Every one-way material action must have an inverse or explicit terminal accounting:

```text
Acquire   → Release
Reserve   → Free
Lock      → Unlock
Spawn     → Death/remove accounting
Increment → Decrement/consume
Grant     → Clear/restore/reset
Persist   → Restore/reset
Schedule  → Cancel/revalidate
Create    → Cleanup
```

Missing inverse is a mandatory contradiction candidate until selected-artifact evidence proves no inverse is required.

## Cross-system stress

Generate crosschecks only when systems share material state, ownership, timing, geometry, selector, resource, or commit target.

High-value interactions include:

```text
Reconnect × Inventory
Reconnect × Death/Respawn
Reconnect × Reward/Score
Retry × Progression
Retry × Reward Commit
Reset × Arena Reuse
Cleanup × New Generation
Global Selector × Arena Isolation
Shared Identity × Cleanup
Terminal Trigger × Terminal Trigger
Remote Gameplay × Residency
Entity Objective × Residency
World Mutation × Reset Footprint
Deferred Work × Owner Generation
Initialization × Admission
Partial Transaction × Retry
Resource Leak × Repeated Run
Multi Arena × Gamerules
Multi Arena × privileged roles
Client Prediction × Cancelled World Mutation
Liquid/Waterlogging × Interaction Guard
Physical Boundary × Collision/Barrier Geometry
```

For each relevant interaction examine guard, scope, exclusion, owner, generation, cleanup, physical/world counter-proof, role authority, world settings, guard activation, and client/server representation.

Do not generate a Cartesian product of unrelated systems.

## Differential lifecycle coverage

Compare equivalent goals reached by different paths when applicable:

```text
Normal Start vs Reconnect Start
Normal Start vs Late Join
Death/Respawn vs Reconnect During Death
Normal Completion vs Timeout Completion
Fresh Run vs Retry
Fresh Run vs Second Run
Normal Loadout vs Shop/Kit Change
Normal Cleanup vs Disconnect Cleanup
Normal Bootstrap vs Reload Bootstrap
```

Compare writers, clearers, ownership, generation guards, required resources, and postconditions.

## Boundary and quantitative coverage

Prefer meaningful boundaries:

```text
1
2 when concurrency exists
known safe limit
safe limit + 1
selected/presented maximum
```

For progression also include first, final-1, final, zero remaining, and the transition immediately after completion.

For bounded resources calculate when possible:

```text
shared budget / per-active-unit cost = safe maximum
```

Compare presented maximum, admission maximum, calculated safe maximum, and actual fallback behavior.

## Mutation, reset, and replica coverage

For resettable world mutation:

```text
Mutation Footprint
- Guaranteed Restore Footprint
= Residual Footprint
```

Classify residuals by later gameplay consequence.

For repeated arenas/regions, normalize to a baseline, compare topology/geometry/native evidence, reuse proof only for equivalent replicas, and route divergent replicas back into MODEL/STRESS/PROVE.

## Knowledge and reliability consumption

Reusable intelligence must be consumed, not merely stored.

`engine/reliability/catalogs/knowledge-detector-bindings.json` verifies that high-value knowledge has a production consumer, analyzer path, and proof path. A knowledge item with no consumer is coverage debt.

Historical regressions/failure patterns may raise search pressure, seed failure families, and test detector recall. They never prove the current defect.

Approved current findings may later improve historical reliability knowledge; current report truth remains current-artifact owned.

## Claim-based proof

Every contradiction entering PROVE must close:

```text
REACHABILITY
CONTRACT
CONTRADICTION
PLAYER_CONSEQUENCE
AFFECTED_SCOPE
BLOCKING_PROOF_CLEARED
```

Use bounded causal slicing:

```text
trigger
→ authoritative mechanism
→ owner/generation
→ broken contract
→ wrong reachable state
→ player-visible consequence
```

Nearby healthy code, generic guard presence, queue existence, platform limits, or generic confidence are not Blocking Proof unless they deterministically prevent the contradicted state.

Absence claims require enumeration of possible authoritative owners and implementation surfaces before absence is considered proven.

Timing-sensitive claims must explicitly prove event ordering and stale/new ownership.

## Runtime-last rule

Runtime verification is only for behavior static/package/formal reasoning cannot decide, such as native pathfinding/collision, actual simulation, client/server ordering, multi-client visual divergence, rendering/input, or performance manifestation.

Each unresolved runtime item becomes exactly one narrow Audit Obligation/question.

## Final conservation gate

Before REPORT:

```text
all discovered material surfaces
+ all material candidates
+ all runtime/detection/model residue
=
SAFE / NOT_APPLICABLE
+ PROVEN findings
+ NEED_VALIDATION findings
+ explicit Audit Obligations
+ REJECTED_WITH_COUNTERPROOF
+ SUPERSEDED_BY
+ INTENTIONALLY_EXCLUDED with reason
```

Nothing may disappear because a detector did not fire, another analyzer looked healthy, approval was withheld, runtime was inconvenient, or a UI/projection omitted it.

Finalization also requires stable artifact identity, one root cause per issue, separate BUG and DESIGN_MISMATCH lanes, impact-derived severity, and no unresolved material coverage hidden behind generic PASS/CHECKED.

## Anti-forgetting rule

A new analyzer, knowledge catalog, reliability pattern, runtime probe, gameplay domain, or audit check is not production-complete until it is connected to:

```text
applicable surface
→ coverage route
→ scenario / RIG requirement
→ production consumer
→ proof criteria
→ closure / finding / obligation
```

If it cannot be routed, record a Detection Gap.

Do not solve coverage by adding parallel checklists, managers, report lanes, or state stores. Improve the earliest existing owner that failed.

## STOP

Stop architecture expansion when every material discovered surface is accounted, every applicable vital domain is terminal, all material interaction/boundary families have dispositions, all contradictions have proof or one narrow unresolved question, and no required capability/knowledge item is silently unused.

The goal is not theoretical completeness over every Minecraft behavior.

The goal is:

> No material gameplay surface or reusable bug-finding capability can disappear from the audit without an explicit disposition.
