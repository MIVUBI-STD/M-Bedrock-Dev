# Detection Coverage Assurance

## Purpose

This document owns the mechanism that proves the audit actually covered the material gameplay surface it discovered.

It does not add another issue taxonomy and it does not replace the Mandatory Gameplay Audit Procedure.

The procedure defines **what checks mean**. This document defines **how discovered evidence is forced through those checks without silently disappearing**.

## Canonical flow

```text
Selected Artifact
→ Surface Discovery
→ Coverage Ledger
→ Applicable Check Routing
→ Automatic Crosschecks
→ Mutable-State Reverse Index
→ Invariant Derivation
→ State-Transition Reachability
→ Differential Lifecycle Analysis
→ Quantitative / Geometry Analysis
→ Proof
→ Coverage Completeness Gate
→ Root-Cause Consolidation
→ Report
```

A material surface may never disappear between Discovery and Proof.

---

# 1. Coverage Ledger

Create one internal ledger row for every material discovered surface.

Required fields:

```text
Surface ID
Surface Type
Source Location / Evidence
Gameplay Owner
Lifecycle Owner
Mutable Resources
Applicable Check IDs
Generated Crosscheck IDs
Proof Result
Finding / Obligation ID
Closure
```

Allowed closure:

```text
SAFE
PROVEN
NEED_VALIDATION
AUDIT_OBLIGATION
NOT_APPLICABLE
```

`NOT_APPLICABLE` requires evidence explaining why the discovered surface cannot participate in the check.

No blank owner, blank route, or silent drop is allowed for a material surface.

---

# 2. Coverage Completeness Gate

Before REPORT, verify:

```text
every material discovered surface
→ has semantic/gameplay owner
→ has applicable check routing
→ has required crosschecks
→ has proof result
→ has final closure
```

Block audit closure when:
- an arena/session-local loop contains an unclassified global selector or world mutation;
- a shared identity tag/property has no cleanup-scope review;
- a material surface has no owner;
- a mutable resource has no lifecycle owner;
- an applicable check was not routed;
- a required crosscheck was not generated;
- a contradiction has no proof result;
- unresolved material evidence is absent from both findings and Audit Obligations.

Coverage completeness is about **accounting**, not claiming every possible runtime defect has been discovered.

---

# 3. Automatic Crosscheck Generator

Generate a Crosscheck only when both systems are applicable and share material state, ownership, timing, selector, resource, geometry, or commit target.

Mandatory derived pairs when both sides exist:

```text
Reconnect × Inventory
Reconnect × Death/Respawn
Reconnect × Reward/Score
Retry × Progression Accounting
Retry × Reward Commit
Reset × Arena Reuse
Cleanup × New Generation
Global Selector × Arena Isolation
Shared Identity Tag × Arena Cleanup
Arena-Local Maintenance × Global Player Selector
Reconnect × Fresh-Session Inventory Reset
Terminal Trigger × Terminal Trigger
Remote Gameplay × Residency
Entity Objective × Residency
World Mutation × Reset Footprint
Deferred Work × Owner Generation
Subscription × Terminal/Reward Commit
Initialization × Admission
Partial Transaction × Retry
Resource Leak × Repeated Run
```

The generator must not create a Cartesian product of unrelated systems.

---

# 4. Mutable-State Reverse Index

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

Applicable resource classes:
- scoreboard/objective;
- tag;
- dynamic property;
- in-memory array/map/set;
- arena/session/player state;
- inventory/equipment/currency;
- entity;
- queue/retry work;
- timer/callback/subscription;
- lease/reservation/ticking area;
- structure/block/container/world mutation.

Automatically challenge:
- multiple writers without authority;
- writer without owner;
- global clearer for local state;
- global player/entity selectors or world commands reached from arena/session-local loops;
- shared tags/properties used as identity while cleanup is scoped by arena/session;
- deferred writer without generation validation;
- create/acquire without cleanup;
- read/write after owner invalidation;
- arena-local resource mutated through global scope;
- persistent state without explicit restore/reset contract.

---

# 5. Invariant Derivation

Derive invariants from selected-artifact gameplay contracts instead of relying only on known bug signatures.

Examples:

```text
active arena → required residency is owned and ready
pending required work > 0 → objective cannot complete
respawn pending → player cannot be active gameplay owner
arena resetting → arena cannot be reusable
fresh session → stale session inventory/state is absent
terminal committed → later terminal commit is rejected/idempotent
arena A cleanup → arena B state is unchanged
purchase success → currency and item commit agree
reconnect restore → restored state belongs to current owner/generation
```

For each invariant:
- identify every writer that can violate it;
- identify every guard that blocks violation;
- generate a contradiction when a reachable writer can violate it without Blocking Proof.

---

# 6. State-Transition Reachability

Build a compact state graph for every material lifecycle.

Example:

```text
IDLE
→ ASSIGNED
→ PRELOAD
→ ACTIVE
→ TERMINAL
→ RESETTING
→ IDLE
```

Add recovery states only when present.

Challenge:
- illegal transition;
- skipped prerequisite;
- duplicate transition;
- transition after owner invalidation;
- old-generation transition into new lifecycle;
- state with no exit/recovery;
- terminal state returning to active without explicit new generation.

Do not invent states not grounded by the selected artifact.

---

# 7. Differential Lifecycle Analysis

Compare equivalent lifecycle goals reached through different paths.

Required comparisons when applicable:

```text
Normal Start vs Reconnect Start
Normal Start vs Late Join
Normal Death/Respawn vs Reconnect During Death
Normal Completion vs Timeout Completion
Fresh Run vs Retry
Fresh Run vs Second Run
Normal Loadout vs Shop/Kit Change
Normal Cleanup vs Disconnect Cleanup
Normal Bootstrap vs Reload Bootstrap
```

Compare:
- writers;
- clearers;
- ownership;
- generation guards;
- required resources;
- postconditions.

A missing or extra mutation on one path becomes a contradiction candidate when it violates the shared lifecycle contract.

---

# 8. Quantitative Capacity Analysis

For bounded shared resources calculate when possible:

```text
shared budget
÷ per-active-unit cost
= safe maximum
```

Compare:

```text
presented maximum
declared/admission maximum
calculated safe maximum
actual fallback/queue behavior
```

Apply to:
- arenas;
- players/teams;
- residency/ticking resources;
- entities;
- retries/waves;
- bounded queues or reservations;
- other selected-artifact resources with explicit limits.

Reason at:
- 1;
- 2 when concurrency matters;
- safe maximum;
- safe maximum + 1;
- selected/presented maximum.

Do not request broad load testing when arithmetic and source ownership already decide the contradiction.

---

# 9. Mutation & Replica Footprint Analysis

For resettable world mutation:

```text
Mutation Footprint
- Guaranteed Restore Footprint
= Residual Footprint
```

Classify every material residual footprint by later gameplay consequence.

For repeated arenas/regions:
- normalize coordinates to a canonical baseline;
- compare topology/geometry/structure footprint;
- identify divergence;
- reuse baseline proof only for equivalent replicas;
- route divergent replicas to the relevant integrity checks.

Never infer replica equivalence from naming or source layout alone.

---

# 10. Regression Detection Corpus

Historical confirmed defects are regression **expectations**, not current-artifact proof.

For each regression case store:

```text
Case ID
Defect Family
Historical Symptom
Expected Detection Check
Expected Crosscheck
Expected Proof Method
Forbidden Shortcut
```

Use the corpus to challenge detector recall.

Do not feed the historical answer into the current finding as proof.

---

# 11. Referential Integrity

Validate material references across selected-artifact content before assuming a gameplay dependency exists.

Applicable references include:

```text
script import / module
entity identifier / event
item / block identifier
structure name
function / command target
dialogue / NPC target
scoreboard objective
tag / dynamic-property key
animation / controller
resource / behavior-pack dependency
```

For each material reference record:

```text
reference
→ source
→ target namespace/type
→ target exists
→ target version/scope
→ reachable consumer
→ failure behavior
```

Challenge missing, stale, renamed, wrong-namespace, wrong-type, or version-incompatible references.

Referential Integrity does not replace gameplay proof. A broken reference becomes a gameplay contradiction only when its reachable consumer and player-visible consequence are grounded.

---

# 12. Claim-Based Proof

Every contradiction entering PROVE is decomposed into explicit claims.

Required claims:

```text
REACHABILITY
CONTRACT
CONTRADICTION
PLAYER_CONSEQUENCE
AFFECTED_SCOPE
BLOCKING_PROOF_CLEARED
```

Each claim records:

```text
status: PROVEN | MISSING
evidence IDs
reason
```

A finding is PROVEN only when all required claims are PROVEN.

Do not use evidence volume or generic confidence as a substitute for claim closure.

---

# 13. Causal Slicing

For each suspicious mutation perform a bounded backward and forward slice.

Backward:

```text
wrong/suspicious state
← writer
← caller/trigger
← owner/generation
← lifecycle boundary
```

Forward:

```text
mutation
→ readers/dependencies
→ transition/commit
→ player-visible consequence
```

Stop the slice at:
- authoritative owner boundary;
- grounded gameplay contract;
- irrelevant/unreachable branch;
- exact Blocking Proof.

The intersection of backward and forward slices should identify:

```text
Root Cause
→ Broken Contract
→ Player Consequence
```

Do not traverse the entire repository when the relevant dependency slice is already closed.

---

# 14. Formal Absence Proof

Absence claims require more than a keyword search.

To prove a required capability/guard/cleanup is absent:

```text
required capability
→ enumerate possible authoritative owners
→ enumerate applicable implementation surfaces
→ search create/write/guard/release paths
→ reconcile dynamic/indirect references
→ Coverage Ledger confirms relevant surfaces accounted
→ no implementation found
→ ABSENCE PROVEN
```

Use for claims such as:
- residency/ticking owner is absent;
- permission guard is absent;
- fresh-session clear is absent;
- generation validation is absent;
- cleanup/release is absent;
- retry accounting is absent.

If dynamic dispatch or unsupported content prevents exhaustive ownership coverage, absence is not proven; preserve the exact missing claim.

---

# 15. Temporal Proof

Represent timing-sensitive contradictions as an ordered event relation.

Example:

```text
T0 old work scheduled
T1 lifecycle invalidated/reset
T2 new generation becomes authoritative
T3 new gameplay starts
T4 old work commits
```

Prove:
- each event is reachable;
- required ordering/overlap is source-grounded;
- T4 targets state/resource owned by the new lifecycle;
- no generation/owner/exclusion guard blocks T4.

Timing alone does not force Runtime Verification.

Use Runtime Verification only when the decisive ordering depends on native scheduling semantics that selected-artifact evidence cannot establish.

---

# 16. Proof Substitution Catalog

Before Runtime Verification, attempt the applicable deterministic substitute.

```text
Runtime question                  Deterministic substitute
-------------------------------   ---------------------------------------------
third arena can start?            admission logic + resource budget + safe max
remote entity remains active?     dependency + geometry + residency ownership
stale inventory survives?         lifecycle differential + complete clearer set
double ending occurs?             terminal reachability + idempotency guards
old callback mutates new run?     temporal ordering + generation guard analysis
world residue remains?            mutation footprint - restore footprint
cross-arena mutation occurs?      selector scope + ownership + blocking guards
duplicate reward occurs?          commit paths + idempotency/transaction guards
```

A substitute is valid only when it decides the same claim as the proposed runtime question.

---

# 17. NEED_VALIDATION Promotion Matrix

NEED_VALIDATION is represented internally by claim closure, not a generic confidence score.

Example:

```text
REACHABILITY             PROVEN
CONTRACT                 PROVEN
CONTRADICTION             PROVEN
PLAYER_CONSEQUENCE        PROVEN
AFFECTED_SCOPE            PROVEN
BLOCKING_PROOF_CLEARED    MISSING
```

The remaining work is therefore exactly Blocking-Proof closure.

Rules:
- more than one vague missing area → continue audit; do not publish NEED_VALIDATION yet;
- one or more missing claims may remain only when each is exact and the combined deciding action is one narrow verification question;
- if deterministic substitution closes the claim → promote to PROVEN or SAFE;
- Runtime Verification asks only the smallest unresolved deciding question;
- after runtime evidence, re-run Blocking-Proof and claim closure before promotion.

Generic labels such as “needs more testing” are invalid.

---

# 18. Multi-Scenario Simulation Model

### Purpose

Reason through realistic concurrent gameplay as if sessions are progressing together, without pretending static analysis is an actual Minecraft runtime execution.

This model generates deterministic scenario interleavings from selected-artifact state machines, ownership, timers, callbacks, admission rules, and failure/recovery paths.

### Simulation dimensions

For every applicable multiplayer/multi-arena map, vary only dimensions supported by the selected artifact:

```text
Players
→ 1
→ 2
→ normal party/team size
→ selected maximum
→ maximum + 1 when admission is material

Arenas / Sessions
→ 1 active
→ 2 concurrent
→ safe calculated maximum
→ safe maximum + 1
→ presented maximum

Connection state
→ stable
→ disconnect before lifecycle boundary
→ disconnect during boundary
→ reconnect before completion
→ reconnect after completion
→ repeated disconnect/reconnect
→ one player disconnects while teammates remain
→ owner/leader disconnects
→ last player disconnects
→ late join when supported

Timing / interruption
→ preload
→ buy/loadout
→ active combat
→ death/respawn
→ wave transition
→ terminal window
→ reset/cleanup
→ arena reuse

Failure injection
→ required command/API step fails where failure is representable
→ spawn attempt fails/retries
→ residency/resource acquisition unavailable
→ teleport/structure mutation incomplete
→ delayed callback survives owner invalidation
```

Do not invent packet loss percentages, latency values, native server ordering, or platform behavior not grounded by selected-artifact/runtime knowledge.

### Scenario tuple

Represent each simulated case as:

```text
Scenario ID
Players
Arena/session count
Initial state
Connection event
Concurrent event
Resource pressure
Expected invariant
Ordered state transitions
Writers / clearers / deferred writers
Blocking Proof
Result
```

Result is one of:

```text
SAFE
CONTRADICTION
IRREDUCIBLE_RUNTIME_QUESTION
```

### Connection-interruption matrix

When reconnect is applicable, automatically generate targeted interruptions at every material lifecycle boundary:

```text
join/admission
preload/setup
inventory reset
loadout/shop
active gameplay
death/respawn
objective/wave transition
terminal commit
cleanup/reset
arena reuse
```

For each interruption compare:

```text
uninterrupted path
vs
disconnect path
vs
reconnect path
```

Compare owner, generation, writers, clearers, pending work, inventory/economy, position/mode, arena assignment, reward/score, and recovery state.

### Multi-player interleavings

When shared state exists, generate bounded cases such as:

```text
P1 acts while P2 disconnects
P1 dies while P2 completes objective
P1 reconnects while P2 advances wave
leader/owner disconnects while party remains
two players trigger the same terminal/objective
two players buy/claim the same bounded resource
one player leaves during cleanup while another remains
```

Only generate a case when both actions share a material state/resource/transition.

### Multi-arena interleavings

When multiple arenas exist, generate:

```text
Arena A starts while Arena B starts
Arena A resets while Arena B remains active
Arena A cleanup while Arena B acquires shared resource
Arena A reconnect while Arena B transitions
Arena A terminal while Arena B uses global selector/state
old Arena A generation cleanup while new Arena A run starts
safe capacity + 1 admission
presented maximum admission
```

Verify arena-local invariants and shared-budget invariants independently.

### Connection proof rule

A connection scenario can become statically PROVEN when selected-artifact evidence establishes:
- the disconnect/reconnect handler is reachable;
- the interrupted lifecycle state is reachable;
- competing writers/clearers have a source-grounded order or overlap;
- the resulting postcondition violates an invariant;
- no applicable Blocking Proof prevents it.

If the deciding fact is native network timing/order not represented by the artifact, preserve one narrow Runtime Verification question instead of inventing behavior.

---

# 19. Scenario Coverage Gate

Before an applicable multiplayer/multi-arena audit closes, require:

```text
all material lifecycle boundaries
× applicable connection interruption
× applicable shared-state interleavings
× applicable arena concurrency boundaries
→ accounted
```

This is a bounded derived set, not a Cartesian product.

A scenario is generated only when its dimensions share:
- state;
- owner;
- lifecycle transition;
- resource;
- selector;
- commit target;
- or recovery path.

Block closure when a material shared-state boundary has no uninterrupted/interrupted comparison.

Track internally:

```text
Generated Scenarios
Safe Scenarios
Contradiction Scenarios
Irreducible Runtime Questions
Unaccounted Material Interleavings
```

Target:
- Unaccounted Material Interleavings = 0
- generic connection-related NEED_VALIDATION = 0

---

# 20. Scenario Reduction & Pairwise Interaction Coverage

### Purpose

Keep multi-scenario simulation broad enough to expose interaction defects without exploding into an unbounded Cartesian test matrix.

### Reduction rule

Start from material scenario dimensions discovered in the selected artifact:

```text
player role/count
arena/session
lifecycle state
connection interruption
concurrent action
shared resource pressure
failure injection
generation
```

Generate a scenario only when at least two dimensions interact through a shared material dependency.

Prioritize pairwise coverage of material interactions, then add higher-order cases only when:
- three or more writers converge on the same resource;
- a terminal/recovery boundary is involved;
- shared capacity is involved;
- an old/new generation overlap exists;
- a known invariant requires all participating dimensions.

### Dominance pruning

Scenario A may cover Scenario B only when A preserves every material condition of B and adds stress without changing the expected contract.

Do not prune when:
- player role/authority differs;
- arena ownership differs;
- lifecycle boundary differs;
- connection interruption occurs on a different side of the commit;
- different writer/clearer ordering is exercised;
- safe maximum vs safe maximum + 1 differs.

### Scenario identity

Use deterministic IDs derived from the material dimensions, for example:

```text
SCN-RECONNECT-PRELOAD-INVENTORY
SCN-ARENA-2START-SHARED-RESIDENCY
SCN-RESPAWN-RECONNECT-ACTIVE-RESTORE
SCN-RESET-REUSE-OLD-CLEANUP
```

Names describe the interaction being evaluated, not an assumed bug outcome.

---

# 21. Scenario Proof Receipt

Every generated material scenario retains one compact internal receipt:

```text
Scenario ID
Triggering checks
Initial authoritative state
Actors / arenas
Ordered events
Shared resources
Expected invariants
Observed source-derived transitions
Blocking Proof searched
Claim closure
Result
Evidence IDs
```

Result:

```text
SAFE
CONTRADICTION
IRREDUCIBLE_RUNTIME_QUESTION
```

A scenario receipt is evidence/control data, not a parallel user-facing report.

When multiple scenarios prove the same root cause, A24 Duplicate Finding Consolidation owns publication.

---

# 22. Connection Recovery Invariants

When disconnect/reconnect exists, derive applicable invariants rather than relying on generic reconnect tests.

Examples:

```text
reconnect does not create a second session owner
reconnect cannot bypass an unfinished death/respawn lifecycle
reconnect cannot bypass a fresh-session reset requirement
reconnect restores the same arena/session identity when that is the authored contract
reconnect cannot duplicate one-shot reward/score commits
disconnect cannot orphan a shared resource indefinitely
last-player disconnect resolves or intentionally preserves session ownership
repeated reconnect does not multiply subscriptions/timers/callbacks
late join does not inherit stale state from another player/session
```

Each invariant must be grounded by the selected artifact's authored lifecycle. Do not impose a generic resume/reset policy on every map.

---

# 23. Simulation Honesty Gate

Before a simulated scenario is promoted to PROVEN, verify:

```text
all relevant transitions are source-grounded
all assumed actors/resources exist in the selected artifact
ordering/overlap is established or causally guaranteed
no native network/server behavior was invented
Blocking Proof search covers the exact commit path
player-visible consequence follows from grounded state
```

If any decisive condition depends on unknown native behavior, convert only that condition into an IRREDUCIBLE_RUNTIME_QUESTION.

Never describe source-derived simulation as an executed Minecraft playtest.

---

# 24. Adversarial Player Abuse Model

### Purpose

Audit the selected map from the perspective of a player actively trying to break rules, escape intended progression, gain unintended advantage, corrupt shared state, or force other sessions into invalid states.

This is a gameplay integrity model for the selected artifact. It does not assume access to server administration, external cheats, modified clients, packet manipulation, credential compromise, or platform exploitation.

### Adversarial objective classes

For every applicable gameplay system, ask whether an ordinary player can intentionally achieve:

```text
SKIP
→ bypass required stage/objective/cooldown

DUPLICATE
→ receive item/reward/score/state more than once

RETAIN
→ keep state/item/privilege past its intended boundary

ESCAPE
→ leave confinement/arena/state without intended transition

CROSS
→ affect another arena/team/player/session

DESYNC
→ make UI/state/ownership disagree

STARVE
→ consume/hold a shared resource so others cannot progress

REPLAY
→ repeat a one-shot action/commit

RACE
→ exploit timing between two legitimate actions

ORPHAN
→ leave resource/session/state without an owner/cleanup

FORCE-FAIL
→ intentionally trigger a recoverable operation failure into a softlock/invalid state
```

These are adversarial goals, not issue types.

### Allowed player action surface

Build an abuse surface from ordinary reachable gameplay actions:

- join/leave/reconnect;
- rapid repeated interaction;
- simultaneous interactions by multiple players;
- death/respawn;
- inventory move/drop/use/craft;
- kit/loadout/shop operations;
- movement/teleport boundaries;
- objective interaction;
- ready/start/retry/restart controls reachable to players;
- arena/team switching when supported;
- timing actions immediately before/after lifecycle boundaries;
- filling capacity/queues/resources through normal admission;
- intentionally causing ordinary in-game failure conditions.

Do not assume unauthorized external tooling or capabilities not provided by the selected artifact.

---

# 25. Abuse-Sequence Generator

For each applicable adversarial objective, derive the shortest reachable sequence of legitimate player actions that could violate an invariant.

Pattern:

```text
target invariant
→ player-controllable actions
→ lifecycle boundary
→ shared/mutable state
→ shortest adversarial sequence
→ Blocking Proof
→ result
```

High-yield sequence shapes:

```text
repeat same action
A → A

interrupt action
A → disconnect → reconnect

cross boundary
A → transition → repeat A

race
P1:A || P2:B

reuse
run 1:A → cleanup → run 2:B

capacity pressure
acquire until safe max → one more acquire

ownership theft
owner leaves → another actor commits

partial transaction
commit step 1 → force/encounter step 2 failure → retry

stale-state reuse
create state → invalidate owner → trigger old consumer
```

Bound sequence depth by material lifecycle relevance. Do not brute-force arbitrary action permutations.

---

# 26. Adversarial Invariant Challenges

Automatically challenge applicable invariants from an abuse perspective.

### Progression

- Can a player skip a required stage?
- Can objective completion be triggered early?
- Can retry/reconnect preserve completion credit incorrectly?
- Can a player intentionally strand required work?

### Inventory / Economy

- Can item/currency/reward be duplicated?
- Can stale items be carried across a fresh-session boundary?
- Can drop/move/craft bypass managed-item restrictions?
- Can purchase/refund/retry create partial or repeated commit?

### Multiplayer / Multi-Arena

- Can one player/session mutate another arena?
- Can a player reserve/hold capacity indefinitely?
- Can simultaneous starts exceed or corrupt shared ownership?
- Can disconnect force incorrect ownership transfer?
- Can one arena's cleanup remove another arena's resource?

### Death / Reconnect / Recovery

- Can disconnect shorten/bypass death, cooldown, spectator, or penalty state?
- Can repeated reconnect multiply restore/grant/subscription behavior?
- Can leave/rejoin escape an intended restriction?

### Terminal / Reward

- Can two players or two terminal conditions commit reward/result twice?
- Can retry/reconnect replay a one-shot terminal consequence?
- Can a player intentionally trigger timeout and objective completion together?

### World / Spatial

- Can movement or interaction escape intended arena/plot/extract boundaries?
- Can player-built/broken state survive reset and affect the next run?
- Can ordinary actions force gameplay into an uncovered simulation region?

### Developer / Debug

- Can ordinary crafting, inventory acquisition, interaction, or command/event reach a developer affordance?
- Can a reachable debug/restart/skip action affect another player/arena?

### UI / Information

- Can a player act on stale/wrong UI information to obtain unintended state?
- Can player-facing availability/capacity disagree with actual admission in an exploitable way?

---

# 27. Abuse Impact & Exploitability Assessment

Do not create a separate exploit issue taxonomy.

For each grounded adversarial path record internally:

```text
Player Control
Repeatability
Required Participants
Required Timing
Affected Scope
Persistence
Recovery
Gameplay Advantage / Denial / Corruption
Existing Blocking Proof
```

Use this to improve severity and reproduction quality, not to replace the canonical BUG / DESIGN_MISMATCH classification.

A defect is not suppressed merely because exploitation requires intentional player behavior. If ordinary reachable actions can deterministically violate the gameplay contract, it remains a valid gameplay finding.

---

# 28. Abuse Coverage Gate

For every material player-controllable mutation or lifecycle boundary, require one of:

```text
not abuse-relevant + reason
abuse path blocked by exact proof
adversarial sequence checked SAFE
adversarial contradiction sent to PROVE
exact irreducible runtime question
```

Before closure verify that applicable adversarial goals have been considered against:
- progression;
- inventory/economy;
- ownership;
- capacity;
- reconnect/recovery;
- terminal/reward;
- world mutation;
- developer affordances.

Track:

```text
Player-Controlled Surfaces
Adversarial Sequences Generated
Blocked Abuse Paths
Adversarial Contradictions
Irreducible Abuse Runtime Questions
Unaccounted Abuse Surfaces
```

Target:
- Unaccounted Abuse Surfaces = 0
- generic "player might exploit this" findings = 0

---

# 29. Regression Repair Rules

These rules are promoted from confirmed Composite regression misses. They strengthen existing mechanisms; they do not add new detection families.

## 29.1 Fresh-Session Reset Invariant

Whenever setup/preload/start performs a full or broad reset of player state, the reset becomes a mandatory lifecycle invariant.

Create a reverse-index entry:

```text
fresh-session reset
→ reset writer
→ targeted players
→ targeted state
→ execution boundary
→ players absent at boundary
→ reconnect/late-join reconciliation
→ later partial clear/grant writers
```

Mandatory differential:

```text
player present during reset
vs
player disconnected during reset and reconnects later
vs
late join when supported
```

Do not close reconnect/inventory coverage until every fresh-session reset has a per-player reconciliation path or a grounded contradiction.

This applies to inventory and any other player state reset at session start.

## 29.2 Cleanup Ownership Crosscheck

Every cleanup writer that mutates player/entity ownership must prove its target is limited to the cleanup owner.

For each cleanup mutation record:

```text
cleanup owner arena/session
→ selector/query
→ target player/entity
→ ownership key/tag/property
→ other active arena/session possible?
→ scope guard
→ mutation
```

If another active arena/session can satisfy the selector/query, automatically generate:

```text
Cleanup × Cross-Arena Ownership
```

Do not suppress a global/broad cleanup path before tracing the complete ownership predicate to its mutation target.

## 29.3 Recurring World-Mutation Spatial Crosscheck

Every recurring or event-driven world mutation around players/entities must prove spatial ownership.

Record:

```text
mutation trigger
→ reference player/entity
→ computed coordinates/volume
→ intended arena/session
→ arena boundary/offset
→ other players/arenas inside possible mutation scope
→ scope guard
→ affected blocks
```

Automatically generate:

```text
Recurring World Mutation × Arena Isolation
```

when:
- coordinates are derived from players/entities rather than a fixed arena-local region;
- the mutation repeats during active gameplay;
- multiple arenas/sessions can coexist.

A mutation is not arena-safe merely because the triggering loop originates from an arena-local subsystem.

## 29.4 Suppression Gate

A potential cross-arena or reconnect contradiction may be suppressed only after the applicable ownership/spatial/reset invariant is fully traced.

Required before suppression:

```text
surface discovered
→ reverse ownership/state index complete
→ required Crosscheck generated
→ exact scope/guard inspected
→ Blocking Proof established
→ SAFE
```

Absence of an immediately obvious consequence is not sufficient for suppression.

---

# 30. Developer-Item Acquisition Graph

This rule is promoted from the unseen The Circuit validation miss. It strengthens Developer Tool & Permission Exposure; it is not a new issue family.

Whenever a developer/debug item or interaction trigger exists, trace ordinary-player acquisition through all applicable content surfaces:

```text
developer item / trigger
← direct grant
← container / authored world inventory
← loot table
← recipe / crafting
← item conversion / replacement
← shop / reward
← structure-loaded inventory
← dropped item / entity drop
← interaction-created item
```

Then trace forward:

```text
item acquired
→ use / hit / interact / drop / craft / equip
→ handler/event
→ gameplay mutation
→ permission/role guard
→ affected scope
```

A developer affordance may be suppressed only after both acquisition and activation graphs are closed.

Script-event reachability alone is not sufficient to close developer-tool exposure when a physical/debug item exists.

## Evidence Receipt Gate

No independent finding may be marked PROVEN in regression/unseen validation unless its run record contains concrete source-evidence receipts sufficient to reconstruct:

```text
reachable trigger
→ wrong mutation/state
→ player-visible consequence
→ Blocking-Proof search
```

A claim-closure matrix without attached evidence receipts is not publication proof.

---

# 31. Regression Repair: Cooperative Participant Accounting

This rule is promoted from the unseen The Gauntlet validation miss. It strengthens progression/multiplayer modeling.

Whenever progression/readiness/completion depends on multiple players, maintain separate sets:

```text
Required Participants
Assigned Session Participants
Currently Online Participants
Currently Eligible/Alive Participants
Participants Observed by the Gate
```

For every cooperative gate record:

```text
authored participant requirement
→ session membership source
→ online-player query/filter
→ disconnect behavior
→ reconnect behavior
→ gate predicate
→ missing-member policy
→ progression consequence
```

Mandatory scenario:

```text
P1 + P2 are required/assigned
→ P2 disconnects
→ gate reevaluates using its actual query
→ determine whether P2 is intentionally preserved, removed, replaced, or silently ignored
```

A gate that queries only currently online players is not automatically safe. Prove that online membership is the authored requirement or that disconnect explicitly updates authoritative required membership.

Crosschecks:

```text
Required Participants × Online Query
Disconnect × Completion Gate
Reconnect × Participant Membership
Last/Owner Player Disconnect × Session Progression
```

Do not suppress cooperative disconnect scenarios until required membership and gate-observed membership are reconciled.

## 31.1 Mandatory Developer-Item Acquisition Closure

For every developer/debug item whose activation mutates progression, terminal state, score, arena/session state, or reset behavior, acquisition analysis is mandatory-to-closure.

Trace all applicable backward paths:

```text
developer item
← recipe/crafting
← recipe ingredients
← ordinary world/container resources
← loot/drop
← shop/reward
← structure-loaded inventory
← direct grant
```

Then prove one of:

```text
UNREACHABLE
→ every ordinary-player acquisition path is blocked by exact evidence

REACHABLE
→ ordinary gameplay can obtain the item
→ trace activation and permission
→ send contradiction to PROVE when gameplay contract is violated
```

The following are not sufficient for suppression:
- no direct grant found;
- no script-event emission found;
- item name implies developer-only use;
- activation handler is hidden from UI;
- recipe existence was not inspected.

For craftable developer items, recipe ingredients must be traced to ordinary gameplay availability before closure.

---

# 32. Regression Repair: Player Capability Model

This rule is promoted from the unseen Build & Decode validation miss. It extends existing acquisition/reachability analysis; it is not a new issue family.

Before evaluating ordinary-player reachability, derive the capabilities intentionally granted to each player role by the selected artifact.

Record:

```text
player role
→ game mode
→ permission/ability state authored by the map
→ inventory/catalog access
→ build/break capability
→ command/event capability if explicitly granted
→ interaction capability
→ movement/flight capability
→ acquisition surfaces created by those capabilities
```

### Game-mode acquisition

When an ordinary participant is intentionally placed in Creative or another mode that changes obtainable resources, treat that mode as an ordinary gameplay acquisition surface.

For Creative participants, Developer-Item Acquisition Graph must include:

```text
developer/debug item
← Creative inventory/catalog availability
← ordinary authored Creative role
```

before suppression.

Do not require a recipe, loot table, direct grant, or container path when the authored game mode itself makes the item obtainable.

### Capability × handler crosscheck

For every gameplay-mutating developer/debug item or control:

```text
ordinary role capability
× item/control acquisition
× activation handler
× permission/role guard
× gameplay consequence
```

A hidden or temporary development item remains reachable if the ordinary authored role can obtain and activate it through its normal capabilities.

### Capability closure

Every ordinary player role must end with:

```text
capabilities modeled
→ acquisition surfaces derived
→ relevant developer/debug surfaces crosschecked
→ SAFE or contradiction
```

Unknown capabilities may remain an exact Audit Obligation only when the selected artifact does not determine them.

---

# 33. Regression Repair: Transactional Referential Integrity

This rule is promoted from the unseen Orb of the Illusioner L2 validation miss. It strengthens existing transaction and Referential Integrity mechanisms.

For every purchase, upgrade, crafting-like exchange, or resource-consuming gameplay transaction, build the complete commit chain:

```text
eligibility
→ price / required resource
→ debit / consume
→ required item/material/reference lookup
→ target mutation / grant / upgrade
→ persistence
→ success feedback
→ rollback / compensation on failure
```

Every material identifier/reference used after debit must pass Referential Integrity before the transaction can be considered SAFE.

Mandatory checks:
- item/material identifier exists and is the expected type;
- lookup can resolve in the selected artifact/version;
- required prerequisite/material is obtainable or intentionally internal;
- debit does not occur before a fallible unresolved prerequisite unless rollback exists;
- mutation/grant failure cannot still emit success;
- retry cannot repeat an already committed debit/grant;
- partial failure has explicit compensation.

A transaction that consumes player value and then deterministically fails because of an invalid/missing required reference is a gameplay contradiction even if the control flow catches the error.

## 33.1 Active-Session Reload Recovery Differential

Treat script/world reload or bootstrap reconstruction during an active session as a first-class lifecycle interruption, distinct from player reconnect.

When reload/bootstrap behavior exists, compare:

```text
pre-reload active session
→ authoritative session/player state
→ required world/entity/structure/object references
→ reload/bootstrap
→ registry/cache reconstruction
→ session recovery
→ required object/reference rebind
→ fallback/abort
→ resulting player state
```

Mandatory questions:
- Which state survives reload?
- Which in-memory ownership is reconstructed?
- Which world objects/entities/structures must be rediscovered?
- Are cached references invalid after reload?
- Does recovery require objects that bootstrap does not recreate/rebind?
- Can a healthy active arena be aborted solely because recovery lookup fails?
- Does fallback preserve player/session consistency?
- Can reload duplicate subscriptions/timers/resources?

Required differential:

```text
normal uninterrupted active session
vs
active session → reload/bootstrap → recovery
```

Do not substitute player reconnect testing for reload recovery.

Crosschecks:

```text
Reload × World Object Reconstruction
Reload × Session Ownership
Reload × Entity/Structure Reference Validity
Reload × Subscription/Timer Registration
Reload × Arena Abort/Recovery
```

---

# 34. Regression Repair: Mandatory Replica Discovery

This rule is promoted from the unseen Manhunt validation miss. It strengthens base Discovery and existing Mutation & Replica Footprint Analysis.

Whenever the selected artifact contains multiple authored arenas, lanes, plots, rooms, islands, regions, or other repeated gameplay instances, replica discovery is mandatory before genre/family prioritization.

Base Discovery must:

```text
enumerate all repeated instances
→ identify instance anchors/offsets/bounds
→ determine canonical authored baseline when supported
→ normalize coordinates
→ compare material footprint/topology
→ record per-instance divergence
→ route every material divergence to gameplay consequence analysis
```

### Material replica comparison

Compare applicable:
- occupied block footprint;
- structural volume/bounds;
- required paths/platforms/walls/barriers;
- spawn/join/objective locations;
- reset/mutation regions;
- entity/structure anchors;
- gameplay-critical containers/block entities;
- void/missing-region exposure.

Do not require byte-identical replicas when intentional variation is authored. Compare the gameplay-required contract.

### Discovery priority rule

Applicable Check Router may reduce specialist checks, but it may not suppress base discovery of:
- repeated physical instances;
- material world geometry;
- instance count/capacity;
- instance-specific configuration.

Map genre is never evidence that physical replica analysis is unnecessary.

### Replica closure

Every repeated instance must be exactly one:

```text
EQUIVALENT FOR GAMEPLAY
INTENTIONALLY DIFFERENT + grounded contract
MATERIALLY DIVERGENT → routed to PROVE
UNRESOLVED → exact missing evidence
```

No repeated instance may remain unenumerated at Coverage Completeness Gate.

---

# 35. Regression Repair: State-Agnostic Fresh-Session Reset

This rule is promoted from the unseen Five Nights at Z Village L1 validation miss. It strengthens the existing Fresh-Session Reset Invariant.

A fresh-session reset is not an inventory-only concept.

Whenever setup, cinematic, preload, join, round start, or session start writes/reset player state, enumerate every affected mutable state domain:

```text
inventory / equipment
currency / coins / economy score
gameplay score / objective values
tags
dynamic properties
role / team / arena assignment
game mode / capability state
health / effects / cooldowns
position / checkpoint
UI/player-facing session state
other per-player mutable state
```

For each state domain record:

```text
state
→ previous-session value possible?
→ fresh-session expected baseline
→ reset writer
→ target player set
→ reset timing/boundary
→ player absent/disconnected at boundary?
→ reconnect/late-join reconciliation
→ later writer/grant
→ Blocking Proof
```

### Setup/Cinematic interruption

Disconnect/reconnect differential is mandatory at every setup boundary that performs per-player reset, including cinematic phases.

```text
present through reset
vs
disconnect before reset
vs
disconnect during reset
vs
reconnect after reset
```

Compare all discovered state domains, not only inventory.

### Reset-domain closure

Coverage Completeness Gate may close fresh-session state only when:

```text
all per-player setup/start writers enumerated
→ state domains classified
→ reset baseline known
→ disconnect/reconnect differential checked
→ reconciliation or contradiction established
```

Do not create separate checks for coins, tags, properties, or inventory. They are domains of the same fresh-session lifecycle contract.

---

# 36. Architecture Freeze Rule

The detection architecture is considered structurally complete after sections 1–17.

Do not add another detection family/mechanism unless a confirmed real defect demonstrates that it cannot be represented by:
- discovered-surface accounting;
- Referential Integrity;
- mutable-state ownership;
- Crosschecks;
- invariants;
- state-transition reachability;
- lifecycle differential;
- capacity/geometry analysis;
- causal slicing;
- absence/temporal proof;
- claim-based proof.

A missed defect that fits an existing mechanism is an implementation/recall failure, not justification for another taxonomy layer.

---

# Coverage metrics

Track internally per audit:

```text
Material Surface Routing       target: 100%
Mutable Resource Ownership     target: 100%
Applicable Check Routing       target: 100%
Required Crosscheck Generation target: 100%
Unaccounted Material Surface   target: 0
Unaccounted Mutable Resource   target: 0
Generic NEED_VALIDATION        target: 0
Exact NEED_VALIDATION Question target: 100%
Duplicate Root-Cause Findings  target: 0
Regression Case Detection      measured, never assumed
```

These are audit-quality metrics, not user-facing bug counts.

---

# Stop rule

Do not expand coverage taxonomy merely because a new symptom appears.

First ask whether the symptom should already be detected by:
- Coverage Ledger;
- reverse resource ownership;
- invariant derivation;
- transition reachability;
- lifecycle differential;
- capacity analysis;
- mutation/replica analysis;
- existing routed integrity checks.

Add a new detection mechanism only when a real defect demonstrates a structural blindspot that these mechanisms cannot represent.
---

# Proof Escalation Gate

## Purpose

Maximize justified `PROVEN` findings before permitting `NEED_VALIDATION`, without lowering the Evidence Receipt standard or creating unsupported certainty.

This is a gate inside the existing PROVE lane. It is not a second audit workflow and it does not add a new finding taxonomy.

## Canonical escalation loop

```text
Contradiction
→ Claim-Based Proof
→ identify exact missing claim
→ targeted evidence search
→ Blocking-Proof Exhaustion
→ deterministic Proof Substitution
→ Formal Absence / Temporal / Quantitative / Referential proof as applicable
→ cross-file causal slice
→ re-run claim closure
   ├─ all claims closed → PROVEN
   ├─ contradiction blocked → SAFE
   └─ one irreducible deciding fact remains → NEED_VALIDATION receipt
```

A failed first proof attempt is never sufficient reason for `NEED_VALIDATION`.

## 1. Exact Missing-Claim Rule

Before escalation, reduce uncertainty to explicit claim(s):

```text
REACHABILITY
CONTRACT
CONTRADICTION
PLAYER_CONSEQUENCE
AFFECTED_SCOPE
BLOCKING_PROOF_CLEARED
```

Do not use:
- “needs testing”;
- “runtime dependent”;
- “uncertain”;
- “cannot confirm”;

without identifying the exact deciding fact.

If multiple vague areas remain, continue audit/model work. Do not publish `NEED_VALIDATION`.

## 2. Blocking-Proof Exhaustion

Before claiming a contradiction, and before giving up to runtime, enumerate applicable blockers:

```text
permission / role guard
owner / arena / team scope guard
generation / revision guard
state prerequisite
idempotency / once-only guard
cleanup / cancellation
retry / compensation / refund
alternate authoritative handler
reconnect reconciliation
reload/bootstrap reconciliation
resource admission / lease guard
entity/item/reference existence guard
world/geometry boundary
terminal-state guard
native/API behavior already fixed by documented semantics
```

For each blocker record:

```text
Blocker
Applicable?
Evidence
Blocks contradiction? YES / NO
Reason
```

`BLOCKING_PROOF_CLEARED` may close only when every applicable blocker is accounted.

## 3. Cross-File Causal Closure

Do not stop at file boundaries.

Build the smallest complete slice:

```text
Player/Runtime Trigger
→ Entry Handler
→ State/Resource Owner
→ Writer / Deferred Writer
→ Reader / Transition
→ Player-Visible Consequence
```

Follow imports, calls, shared keys/tags/objectives, entity events, structure/function references, callbacks, subscriptions, and persisted identifiers when material.

Stop only at an authoritative owner, exact blocking proof, unreachable branch, or grounded consequence.

## 4. Deterministic Substitution Exhaustion

Before runtime verification, attempt every applicable substitute that decides the same claim.

Priority:

```text
source control-flow proof
state/lifecycle differential
ownership + generation proof
referential integrity proof
formal absence proof
quantitative/capacity arithmetic
mutation footprint - restore footprint
replica/geometry proof
transaction/commit graph
terminal idempotency graph
temporal event ordering
player-capability acquisition graph
```

Do not request runtime merely because runtime would be easier.

## 5. Formal Absence Strengthening

An absence claim is publishable only after:

```text
required capability/guard
→ possible authoritative owners enumerated
→ applicable implementation surfaces enumerated
→ direct + indirect/dynamic references reconciled
→ create/write/guard/release paths searched
→ Coverage Ledger confirms no material owner omitted
→ absence closed
```

A keyword miss is not absence proof.

## 6. Contradiction Escalation Receipt

Every contradiction that does not close on first pass keeps an internal receipt:

```text
Contradiction ID
Missing Claim
Targeted Search Performed
Applicable Blockers Checked
Substitution Methods Attempted
Cross-File Slice Closed?
Remaining Deciding Fact
Outcome: PROVEN / SAFE / NEED_VALIDATION
```

This receipt prevents repeated generic uncertainty and makes later engine improvement measurable.

## 7. NEED_VALIDATION Hard Gate

`NEED_VALIDATION` is allowed only when all fields below are present:

```text
Static Evidence Exhausted: YES
Coverage Ledger Closed: YES
Blocking-Proof Exhaustion: YES
Deterministic Substitutes Exhausted: YES
Cross-File Causal Slice: CLOSED to the irreducible boundary
Exact Missing Claim: <one deciding claim>
Exact Missing Fact: <one fact source cannot decide>
Why Artifact Cannot Decide It: <specific reason>
Minimal Runtime Scenario: <one narrow scenario>
Observable Result A: <promotes/blocks contradiction>
Observable Result B: <promotes/blocks contradiction>
```

If any field is missing, return to PROVE.

## 8. Runtime-Irreducible Boundary

Legitimate examples include a deciding fact that depends on:
- native engine scheduling/order not represented by selected-artifact evidence;
- platform/runtime behavior with no authoritative static semantic available;
- actual performance threshold where source establishes load but not whether runtime crosses the failure threshold;
- nondeterministic external/native behavior not controlled or specified by the artifact.

Not legitimate:
- source is large;
- evidence spans multiple files;
- search is inconvenient;
- behavior uses callbacks;
- concurrency exists;
- no obvious guard was found;
- tester could confirm it faster.

## 9. Proof Yield Metrics

Track per audit:

```text
Contradictions entering PROVE
Closed PROVEN
Closed SAFE
Entered escalation
Promoted to PROVEN after escalation
Closed SAFE after escalation
Irreducible NEED_VALIDATION
Unsupported PROVEN = 0
Generic NEED_VALIDATION = 0
```

Primary quality target:

```text
maximize justified PROVEN
minimize irreducible NEED_VALIDATION
keep unsupported PROVEN at zero
```

Do not optimize the metric by lowering proof standards or suppressing honest irreducible runtime questions.

## 10. Stop Rule

Stop escalation when:
- all required claims are proven;
- an exact blocker disproves the contradiction;
- or the Hard Gate proves one irreducible runtime fact remains.

Do not continue searching after deterministic closure merely to increase evidence volume.


