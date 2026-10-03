# Mandatory Gameplay Audit Procedure

> Operator navigation starts at `master-selected-map-audit-workflow.md`. This document remains the executable checkpoint contract and does not define a competing operator flow.

## Purpose

This is the canonical base procedure for every selected-map gameplay audit.

It is not a tester checklist and it is not a second knowledge base. It defines the minimum complete work that must exist before an audit can claim closure.

Before this production flow starts, user-initiated pre-testing audits require one communication preflight:

```text
user request
→ normalized prompt intake
→ Pre-Audit Plan
→ explicit chat confirmation
→ confirmation receipt
```

This preflight confirms **what will be checked and how the audit will work**. It is not a gameplay checkpoint and does not alter stage authority.

The production flow itself remains linear and has one canonical order:

```text
TARGET
→ DISCOVERY
→ UNDERSTAND
→ MODEL
→ STRESS
→ PROVE
→ REPORT
```

TARGET and DISCOVERY are first-class ordered stages. They are not aliases of UNDERSTAND and they are not parallel workflows. No later stage may authorize a decision while an earlier stage is blocked. Runtime evidence, review, HTML, and other projections are continuations or presentations of this same flow, never alternate audit paths.

Supporting documents such as Gameplay Model Closure, Blind Spots, and Cross-System Interaction provide specialist knowledge. They do not replace this procedure and they do not own a parallel checklist.

## Coverage adequacy invariant

Coverage presence is not coverage completion.

For every discovered material gameplay surface, the canonical audit must prove one of:

```text
static proof sufficient
or
targeted runtime proof executed/requested as an Audit Obligation
or
Detection Gap recorded as an Audit Obligation
or
not-applicable with positive evidence
```

A discovered surface, analyzer execution receipt, scenario object, or domain label by itself is never enough to claim that the required behavior was tested.

Unresolved evidence must remain actionable:

```text
RUNTIME_BLOCKED
→ exactly one narrow Audit Obligation / runtime proof request

DETECTION_GAP
→ exactly one Audit Obligation for missing semantic/detection proof
```

The publication gate may stop final closure, but investigation may continue collecting high-confidence evidence from later surfaces. An earlier blocker must never make unrelated required tests disappear.

### Boundary policy

When a material capacity or count exists, prefer meaningful boundaries rather than an arbitrary representative sample:

```text
1
2 when concurrency exists
known safe limit
safe limit + 1
selected-map maximum
```

Deduplicate identical values. For progression counters also cover first, final-1/final, zero remaining, and the transition immediately after completion when applicable.

### Inverse/negative-space policy

Every acquired or one-way material action must have its semantic inverse or explicit terminal accounting challenged:

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

Absence of the inverse is not automatically a bug, but it is a mandatory contradiction/test candidate until selected-artifact evidence proves why no inverse is required.

## Flow-first execution rule

The checkpoint owner remains TARGET → DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE → REPORT, but checks are executed and presented in player-flow order:

```text
ENTRY / JOIN
→ READY / START
→ SETUP
→ ACTIVE GAMEPLAY
→ PROGRESSION
→ TERMINAL
→ CLEANUP / REPLAY
→ RECOVERY
```

Technical domains such as chunk simulation, combat, inventory, persistence, economy, entity AI, spatial authority, and multi-arena are attached to the gameplay stage where they affect the player. They must not become independent audit branches.

For every material gameplay stage record:

```text
Entry condition
Owner
Required state/components
Player action / system action
Success condition
Failure condition
Next stage
Cleanup / recovery
Applicable technical checks
```

A map may merge or omit stages. Applicability is derived from the selected artifact, not forced from this template.

## Issue taxonomy rule

Only causal gameplay findings may be classified as issues. Discovery gaps, model gaps, unresolved runtime dependencies, incomplete counter-proof, negative-space risks, temporal risks, and unclassified replica divergence remain `Audit Obligation` until they establish a player-visible causal contradiction.

Confirmed / confirmation-ready gameplay findings must be classified through one taxonomy before REPORT:

```text
issueType
+ gameplayFlow
+ failureDomain
+ contributingDomains
+ severity at confirmed-report classification
```

Failure domain describes the primary gameplay failure surface, not necessarily every technical subsystem involved. Cross-system involvement is preserved in `contributingDomains`.

Examples:

```text
wave cannot complete because remote mobs stop simulating
primary: progression-wave-objective
contributing: chunk-simulation, entity-ai-combat

6 arenas presented but only 2 can run
primary: arena-multi-arena
issueType: DESIGN_MISMATCH

purchase removes coins but grant fails
primary: inventory-economy
issueType: BUG
```

Severity is impact-derived later; domain must never preselect severity.

## Issue classification rule

After a contradiction survives proof, classify it exactly once by:

```text
Issue Type
→ Gameplay Flow
→ Primary Failure Domain
→ Contributing Domains
→ Information Mismatch facet
→ Severity after player-impact proof
```

Cross-system participation does not create extra findings. One root cause remains one issue with one primary domain and optional contributing domains.

## Full-map replica flow

When repeated arenas/regions exist, full-map inspection must not audit each arena as an unrelated map. The canonical MODEL subflow is:

```text
world DB / topology
+ source/config layout
→ detect repeated arena regions
→ normalize each arena to relative coordinates
→ select canonical baseline
→ compare world/topology fingerprints
→ compare block-entity/native records when available
→ classify replica proof
→ reconcile world DB versus source/config
→ classify delta
→ escalate only material/unresolved delta to STRESS/PROVE
```

Replica classification semantics:

```text
equivalent / expected variant
→ reuse baseline proof

material divergence
→ continue to causal PROVE

incomplete / no proof
→ MODEL remains PARTIAL
```

A physical arena count is not proof of equivalent gameplay. Source/config equivalence is also not enough when world DB/topology differs. Full-map closure requires both replica integrity and runtime/source ownership reasoning.

Do not generate one duplicated bug per arena when the same root cause affects all equivalent replicas. Conversely, do not generalize one arena's proof to all replicas when a material delta exists.

## Crosscheck rule

Every contradiction reaching PROVE must be challenged from all context-relevant dimensions before confirmation:

- guard / eligibility;
- scope;
- exclusion;
- ownership for shared or multiplayer resources;
- generation/revision for deferred, retry, reconnect, reload, or reuse paths;
- cleanup/release for terminal and replay paths.

Technical root cause and player-visible consequence are recorded separately. A valid technical constraint may explain the root cause while the reduced/misleading gameplay capability remains a reportable issue.

## Checkpoint contract

Every checkpoint in this procedure is executable and must define:

```text
Trigger
Required Inputs
Mandatory Questions
Required Evidence
Failure Patterns
Output
Closure Rule
```

A heading without these answers is not an implemented audit procedure.

---

# A. UNDERSTAND

## A1. Selected Artifact Integrity

### Trigger

Always.

### Required Inputs

- selected `.mcworld`;
- map/version metadata;
- behavior/resource pack manifests;
- file inventory;
- artifact fingerprint/identity where available.

### Mandatory Questions

- What exact artifact is being audited?
- What map/version does it claim to be?
- Which packs belong to this selected artifact?
- Is any stale/duplicate/foreign pack or source mixed into the audit?
- Are Expected and Actual Behavior being derived from this same artifact?

### Required Evidence

At minimum:

```text
artifactId
mapVersion
pack identities
file inventory
source/artifact fingerprint when available
```

### Failure Patterns

- multiple map versions mixed;
- old/development sources entering gameplay authority;
- manifest or pack identity mismatch;
- artifact version ambiguity;
- current behavior inferred from archive/reference material.

### Output

`SelectedArtifactReceipt` or equivalent authoritative artifact identity record.

### Closure Rule

CLOSED only when one exact selected map/version is deterministic and all current gameplay evidence is scoped to it.

---

## A2. Gameplay Surface Discovery

### Trigger

Always.

### Required Inputs

Selected-artifact sources, including applicable:

- scripts;
- functions;
- entities;
- structures;
- dialogue/UI;
- scoreboards;
- tags;
- commands;
- dynamic properties;
- world DB/native data.

### Mandatory Questions

For each discovered surface:

- What is it?
- Is it player-visible or progression-significant?
- What gameplay purpose does it serve?
- Does it create/read/mutate state?
- Does it have lifecycle or ownership?
- Which other systems depend on it?

### Required Surface Classes

The engine must actively discover applicable members of:

```text
ENTRY
JOIN
READY
START
ARENA
PHASE
LEVEL
WAVE
OBJECTIVE
ACTOR
ITEM
INVENTORY
COMBAT
DEATH
REVIVE
RESPAWN
REWARD
SCORE
CURRENCY
SHOP
TELEPORT
CINEMATIC
INPUT_LOCK
QUEUE
CAPACITY
PERSISTENCE
RECONNECT
RELOAD
CLEANUP
RETRY
VICTORY
DEFEAT
WORLD_MUTATION
STRUCTURE
```

This list is a discovery vocabulary, not an instruction that every map contains every surface.

### Required Evidence

For every material surface:

```text
surfaceId
type
selected-artifact source
gameplay purpose
owner/scope if known
dependencies
player-visible?
material?
```

### Failure Patterns

- material surface exists with no semantic owner;
- implementation exists but no gameplay purpose can be mapped;
- unparsed/unsupported material source silently disappears;
- discovered source omitted because the happy path does not use it.

### Output

Gameplay Surface Inventory.

### Closure Rule

Every discovered material surface must be accounted as understood, blocked, unknown/detection-gap, or not-applicable.

---

## A3. Player Journey Reconstruction

### Trigger

Always.

### Required Inputs

Gameplay Surface Inventory and selected-artifact gameplay intent.

### Mandatory Questions

At every major stage:

- How does the player enter?
- What triggers this stage?
- What state must already exist?
- What state is created or consumed?
- What constitutes success?
- What constitutes failure?
- How does the player leave?
- What happens if the player disappears?

### Required Journey

At minimum map the applicable chain:

```text
ENTRY
→ JOIN
→ READY / START
→ SETUP
→ ACTIVE GAMEPLAY
→ PROGRESSION
→ TERMINAL
→ CLEANUP
→ REPLAY / EXIT
```

Branches are allowed and expected.

### Required Evidence

For each stage:

```text
Stage
Entry Condition
Owner
State Created
State Consumed
Success Exit
Failure Exit
Cleanup
Next Stage
```

### Failure Patterns

- stage has no grounded entry or exit;
- only happy path exists;
- failure has no exit;
- cleanup is assumed rather than reachable;
- retry/replay route is missing;
- a stage can be entered with impossible prerequisites.

### Output

Player Journey Graph.

### Closure Rule

Every required gameplay stage has grounded entry, success/failure exit, and next-state accounting.

---

## A4. State Registry

### Trigger

Whenever gameplay state exists.

### Required Inputs

Semantic IR, gameplay intent, scripts/functions, scoreboards/tags/properties.

### Mandatory Questions

For every material state:

- What is its scope?
- Who creates it?
- Who reads it?
- Who mutates it?
- Who clears it?
- What is its lifetime?
- Is it persisted?
- Can it become stale?

### Required State Record

```text
State ID
Scope: player / arena / session / world / entity
Created By
Read By
Mutated By
Cleared By
Lifetime
Persistence
Stale-State Risk
```

### Failure Patterns

- write without clear;
- multiple writers without authority;
- arena-local gameplay using world-global state;
- offline/dead player remains counted;
- state survives beyond its intended generation/run;
- stale state can mutate a later run.

### Output

State Registry.

### Closure Rule

Every material state has scope, lifecycle, and clear/preserve semantics or an explicit Detection Gap.

---

## A5. Ownership Registry

### Trigger

Whenever multiple players, sessions, arenas, entities, callbacks, or mutable shared resources exist.

### Required Inputs

State Registry, gameplay intent ownership edges, semantic IR, lifecycle analyzers.

### Mandatory Questions

For every material owner:

- Who owns this mutation/resource?
- What identifies the owner?
- Is there a generation/revision?
- How is ownership acquired?
- How is it validated before mutation?
- How is it released?
- What happens if the owner disappears?

### Required Ownership Record

```text
Owner
Owner ID
Generation/Revision
Acquire
Validate
Release
Owned Resources
Owner-Disappearance Behavior
```

### Failure Patterns

- no owner;
- ambiguous owner;
- old generation can commit;
- reconnect creates conflicting owners;
- arena reuse occurs before old ownership invalidation;
- global mutation executed from arena path without lease/restore.

### Output

Ownership Registry.

### Closure Rule

Every material mutable resource has one authoritative lifecycle or an explicit unresolved ownership gap.

---

## A6. Progression Contract

### Trigger

Whenever gameplay progresses through objectives, waves, levels, scores, checkpoints, kills, collections, or stages.

### Required Inputs

Player Journey Graph, State Registry, actor/objective mechanics.

### Mandatory Questions

- What starts progression?
- What condition is counted?
- Where is it tracked?
- What mutates the tracker?
- What marks completion?
- What transition consumes completion?
- What happens if an intermediate event fails or disappears?

### Required Chain

```text
Trigger
→ Condition
→ Tracker
→ Mutation
→ Completion
→ Transition
```

### Failure Patterns

- spawn/request counted but actual result not tracked;
- removal/death does not decrement accounting;
- retry duplicates tracker state;
- objective reaches zero but transition never fires;
- transition fires without satisfying objective;
- failed intermediate work disappears from accounting.

### Output

Progression Contract per material objective/mechanic.

### Closure Rule

Every required progression chain reaches a grounded player-visible transition or is explicitly unresolved.

---

## A7. Gameplay Model Closure

### Purpose

Aggregate UNDERSTAND closure after journey, state, ownership, and progression reconstruction.

### Closure Rule

Gameplay Model Closure is `CLOSED` only when:

- the material state model is complete;
- material boundaries are extracted;
- no discovered material surface remains unaccounted.

`OPEN` or `PARTIAL` blocks continuation through the Mandatory Audit Procedure. Admission does not re-evaluate this closure separately.

### Output

`GameplayModelClosure`.
---

# B. MODEL

## B1. Actor / Entity Contract

### Trigger

When gameplay-critical entities/NPCs/mobs/projectiles exist.

### Required Inputs

Entity definitions, spawn evidence, AI/navigation analysis, progression contracts.

### Mandatory Questions

- What is the actor's role?
- How is it spawned?
- Where is it spawned?
- Does it need remote simulation?
- What target does it require?
- Can it navigate to the target?
- How does it interact/fight?
- How is death/removal observed?
- How does it affect progression?
- How is it cleaned up?

### Required Record

```text
Entity ID
Role
Spawn Trigger
Spawn Location
Simulation Requirement
Target
Navigation
Interaction/Combat
Death/Removal
Progression Contribution
Cleanup
```

### Failure Patterns

- unreachable spawn;
- missing target;
- incomplete AI stack;
- incompatible navigation environment;
- actor unload/despawn not accounted;
- cleanup absent;
- removed entity leaves progression blocked.

### Output

Actor/Entity Contract.

### Closure Rule

Every progression-critical actor has a complete spawn→act→terminate→account chain.

---

## B2. Spatial & Simulation Contract

### Trigger

When gameplay depends on world regions, distant actors, structures, teleports, or off-player logic.

### Required Inputs

Spatial intent, region contracts, structure placement, chunk/ticking evidence.

### Mandatory Questions

- Which region matters?
- Which actor/system depends on it?
- Can the player be outside simulation distance?
- Is explicit simulation ownership required?
- Is readiness proven before dependent work?
- Is capacity sufficient?
- Is simulation released?

### Required Record

```text
Region
Actor/System
Purpose
Player Distance / Locality
Needs Simulation?
Ticking/Residency Mechanism
Readiness
Capacity
Release
```

### Failure Patterns

- remote dependency with no simulation mechanism;
- acquire without release;
- release unreachable;
- capacity unchecked;
- work begins before readiness;
- one arena's simulation steals capacity from another.

### Output

Spatial/Simulation Contract.

### Closure Rule

Every remote gameplay dependency has grounded residency/readiness/ownership or a contradiction/detection gap.

---

## B3. Multiplayer Contract

### Trigger

When more than one player is supported or shared player state exists.

### Required Inputs

State Registry, Ownership Registry, party/admission/capacity evidence.

### Mandatory Questions

- Which state is player-local?
- Which is shared?
- Is there a leader/owner assumption?
- What changes when one player leaves/dies/disconnects?
- Can simultaneous actions race?
- Are rewards/progression scaled or shared correctly?

### Required Scenarios

Where applicable:

```text
1 player
2 players
max players
max + 1
one player leaves
one player dies
one player disconnects
simultaneous player actions
```

### Failure Patterns

- offline player blocks wipe/vote/progression;
- player-local state stored globally;
- simultaneous actions duplicate transition/reward;
- party resize invalidates threshold;
- owner leaves and no authority transfer occurs.

### Output

Multiplayer Contract.

### Closure Rule

Shared vs player-local ownership and relevant player-count boundaries are fully accounted.

---

## B4. Multi-Arena Contract

### Trigger

When more than one arena/session/front can exist.

### Required Inputs

Arena topology, capacity, lifecycle, isolation, global-state analysis.

### Mandatory Questions

- How is an arena assigned?
- How many arenas are visible?
- How many can actually run concurrently?
- Can sessions start independently?
- Are selectors/state/entities/world mutations isolated?
- Is cleanup isolated?
- Is arena reuse generation-safe?

### Required Checks

```text
Assignment
Capacity
Parallel Start
State Isolation
Selector Isolation
Entity Isolation
Block Mutation Isolation
Reward Isolation
Message Isolation
Audio Isolation
Cleanup Isolation
Reuse
```

### Failure Patterns

- visible arena count exceeds unexplained playable concurrency;
- global selector crosses arenas;
- global gamerule/world mutation is arena-owned without lease;
- cleanup in A mutates B;
- arena reused before old callbacks/state expire.

### Output

Multi-Arena Contract.

### Closure Rule

Capacity and isolation are grounded independently. Queue/fallback existence alone never proves reduced capacity is intended.

---

## B5. Boundary Registry

### Trigger

Whenever a material numeric/discrete limit exists.

### Required Inputs

Config, scripts, scoreboards, gameplay contract.

### Mandatory Questions

- What is the boundary value?
- What gameplay purpose does it serve?
- Is it player-visible?
- What should happen immediately below/at/above the boundary?

### Required Cases

Use only meaningful cases:

```text
0
1
max-1
max
max+1
```

### Typical Boundaries

- player/party capacity;
- arena capacity;
- retry count;
- wave/level count;
- lives;
- timer;
- score threshold;
- reward threshold;
- ticking-area capacity.

### Output

Boundary Registry with source, purpose, and expected behavior.

### Closure Rule

Every material boundary has selected-artifact grounding and relevant edge-case semantics.

---

# C. STRESS

## C1. Combat Lifecycle

### Trigger

When damage/combat/downed/death mechanics exist.

### Required Chain

```text
Damage
→ Hurt
→ Downed?
→ Revive?
→ Death
→ Respawn
→ Terminal?
```

### Mandatory Questions

- Is death distinct from hurt/downed?
- Can self-revive happen?
- Can multiple revivers race?
- Can stale revive commit?
- Can revive happen after death?
- Are projectiles/effects cleaned up?
- Is respawn generation-safe?

### Failure Patterns

- self revive where forbidden;
- multiple revive ownership;
- stale revive;
- revive after terminal death;
- projectile/effect survives cleanup;
- combat callback mutates next run.

### Output

Combat Lifecycle Contract.

### Closure Rule

Every combat terminal/recovery path is accounted or explicitly unresolved.

---

## C2. Inventory Lifecycle

### Trigger

When gameplay grants/equips/drops/restores items.

### Required Chain

```text
Grant
→ Equip
→ Use
→ Drop
→ Consume
→ Clear
→ Restore
```

### Mandatory Contexts

- start;
- death;
- respawn;
- retry;
- disconnect;
- reconnect;
- cleanup;
- second run.

### Failure Patterns

- inventory cleared but equipment remains;
- copy mutation without writeback;
- multiple restore owners;
- reconnect duplicates loadout;
- stale item survives second run.

### Output

Inventory Lifecycle Contract.

### Closure Rule

Every material item class has a deterministic lifecycle across all applicable recovery/cleanup contexts.

---

## C3. Reward / Economy Contract

### Trigger

When rewards, loot, score, currency, pickups, or shops exist.

### Required Record

```text
Source
Trigger
Eligibility
Delivery
Consume
Idempotency
Persistence
Cleanup
```

### Mandatory Questions

- Can engine loot and script reward overlap?
- Does pickup conversion consume/reconcile the pickup?
- Can terminal callbacks award twice?
- Is reward bound to the correct player/arena/run?
- What happens if inventory is full?

### Failure Patterns

- duplicate reward path;
- non-idempotent reward;
- pickup credits without consume;
- stale drops survive cleanup;
- reward commits after terminal ownership changes.

### Output

Reward/Economy Contract.

### Closure Rule

Every material reward path has grounded entitlement, delivery, idempotency, and cleanup semantics.

---

## C4. Persistence Matrix

### Trigger

When persistent/dynamic/saveable state exists.

### Required Rows

Where applicable:

```text
level
wave
timer
score
currency
inventory
upgrade
life state
enemy state
arena ownership
pending callback
objective
```

### Required Columns

```text
Persist on Disconnect?
Restore on Reconnect?
Persist on Reload?
Clear on Defeat?
Clear on Victory?
Clear on Cleanup?
Clear Before Second Run?
```

### Failure Patterns

- append without clear;
- world-scoped state for run-local behavior;
- timer/callback not reconstructed;
- stale session/arena ownership survives;
- state over-persists or under-persists.

### Output

Persistence Matrix.

### Closure Rule

Every material persisted state has explicit save/reset/restore behavior for applicable lifecycle boundaries.

---

## C5. Deferred Work Registry

### Trigger

When timers, intervals, delayed callbacks, cinematics, delayed spawn/teleport/cleanup exist.

### Required Record

```text
Scheduled By
Owner
Generation
Delay
Mutation
Guard Before Commit
Cancel Path
```

### Mandatory Questions

- Is owner still valid at commit?
- Is generation/revision unchanged?
- Can cleanup/retry/reconnect happen first?
- Is pending work cancelled or revalidated?

### Failure Patterns

- callback from old generation mutates new run;
- delayed teleport moves reconnected player;
- delayed spawn occurs after terminal;
- timer survives cleanup.

### Output

Deferred Work Registry.

### Closure Rule

Every material deferred mutation is generation/owner guarded or explicitly unresolved.

---

## C6. Terminal Ownership

### Trigger

When two or more terminal conditions exist.

### Required Terminal Events

Applicable examples:

```text
victory
defeat
timeout
all dead
objective complete
abort
disconnect
admin stop
```

### Mandatory Questions

For each materially co-occurring pair:

- Can both become true in the same tick/window?
- Which authority wins?
- Is the loser invalidated?
- Can losing callbacks still commit?

### Failure Patterns

- duplicate terminal transition;
- reward after defeat;
- respawn after victory;
- cleanup before result commit;
- timeout and objective completion both commit.

### Output

Terminal Collision Matrix.

### Closure Rule

Every materially concurrent terminal pair has deterministic ownership.

---

## C7. Cleanup Ledger

### Trigger

Whenever gameplay acquires mutable resources.

### Required Resources

Applicable:

```text
membership
tags
effects
entities
timers
callbacks
scoreboards
inventory
structures
gamerules
ticking areas
input permissions
world mutations
```

### Required Record

```text
Resource
Acquire
Owner
Release/Reset
Terminal Paths Covered
```

### Failure Patterns

- acquired with no release;
- cleanup reachable only from one terminal;
- partial equipment/state cleanup;
- global resource not restored;
- callback/resource survives arena reuse.

### Output

Cleanup Ledger.

### Closure Rule

Every acquired material resource is released/reset on every applicable terminal path or explicitly blocked.

---

## C8. Second-Run Equivalence

### Trigger

When replay/retry/arena reuse is possible.

### Mandatory Comparison

Compare Run 2 baseline against a fresh run for:

- state;
- entities;
- inventory;
- score;
- structures;
- timers;
- callbacks;
- arena/session ownership;
- global state.

### Failure Pattern

Run 2 is not gameplay-equivalent to a fresh run because stale state/resource survives.

### Output

Second-Run Equivalence Assessment.

### Closure Rule

Run 2 is gameplay-equivalent or every divergence is grounded as intended.

---

## C9. Cross-System Activation

### Trigger

Automatically when relevant systems coexist.

### Activation Rules

At minimum:

```text
IF reconnect + death/respawn
→ require Reconnect × Death/Respawn

IF reconnect + inventory/reward
→ require Reconnect × Inventory/Rewards

IF reload + timer/deferred work
→ require Reload × Deferred Work

IF retry + progression/reward
→ require Retry × Progression/Rewards

IF cleanup + entity/world/reward
→ require relevant Cleanup intersection

IF multi-arena + global state/selector/projectile
→ require relevant Multi-Arena intersection

IF structure load + enemy spawn/teleport
→ require Structure Load intersection

IF death/timeout + objective completion
→ require Terminal Collision intersection

IF player leave + arena ownership
→ require ownership intersection
```

### Mandatory Questions

- Can both systems act in the same tick/window?
- Which one owns authority?
- Can one invalidate the other's pending work?
- Is state revalidated before commit?
- Can the combination duplicate/skip/reorder transition?
- Can state leak to another player/arena/run?

### Output

Activated Cross-System Scenario Set.

### Closure Rule

Every applicable activated intersection is checked, blocked, or explicitly not-applicable with reason.

---

# D. PROVE

## D1. Required Inspection Graph (RIG)

### Trigger

For every material Gameplay Scenario.

### Required Node

```text
Requirement ID
Scenario
Gameplay Dependency
Knowledge Domain
Scope
Required Capability
Prerequisite Nodes
Execution Status
Evidence
Finding
```

### Mandatory Rule

`checked` is not a valid proof state.

Each node must resolve through:

```text
scenario
→ required knowledge
→ capability
→ execution
→ scoped evidence
→ receipt
```

### Failure Patterns

- analyzer exists but was not executed;
- execution receipt not scoped to requirement;
- prerequisite unresolved;
- capability missing;
- aggregate counter used as scenario proof.

### Output

Required Inspection Graph + Knowledge Receipts.

### Closure Rule

Every required node is SATISFIED or explicitly blocks closure as prerequisite/knowledge/capability gap.

---

## D2. Contradiction Admission

### Trigger

Whenever technical evidence conflicts with a required gameplay dependency.

### Required Chain

```text
Technical Fact
→ Gameplay Dependency
→ Scenario
→ Trigger
→ Expected
→ Actual
→ Player Consequence
→ Affected Scope
```

### Failure Pattern

Technical anomaly has no player-visible gameplay consequence or no grounded Expected behavior.

### Output

Gameplay Causal Link with PROVEN / CONTRADICTED / RUNTIME_BLOCKED / DETECTION_GAP.

### Closure Rule

No technical finding enters report reasoning without gameplay correlation.

---

## D3. Counter-Proof Search

### Trigger

Every CONTRADICTED causal link before defect confirmation.

### Required Search Targets

- reachable guard;
- ownership validation;
- generation/revision check;
- scope validation;
- explicit exclusion;
- reachable cleanup;
- deterministic fallback that prevents the wrong state.

### Blocking Standard

Counter-proof is valid only if it is:

```text
reachable
+
executes before the wrong mutation
+
deterministically makes the wrong state unreachable
```

### Non-Proof

Not sufficient:

- nearby healthy code;
- queue exists;
- fallback exists;
- config exists;
- naming suggests safety;
- implementation appears intentional.

### Output

One of:

```text
BLOCKING_COUNTERPROOF
COUNTERPROOF_SEARCH_REQUIRED
RUNTIME_PROOF_REQUIRED
DETECTION_GAP
CONFIRMED_DEFECT_READY
```

### Closure Rule

No contradiction reaches Proposed Bug Set with counter-proof search unresolved.

---

## D4. Root-Cause Consolidation

### Trigger

Before report candidate creation.

### Mandatory Questions

- Do multiple causal links share one semantic owner?
- Do they share one wrong mutation/guard/selector/state owner?
- Would one repair unit fix all manifestations?
- Are manifestations merely different player-visible consequences of one root cause?

### Example

```text
global @a selector
→ wrong reward
→ wrong message
→ wrong sound
= one root-cause defect
```

### Output

One report candidate may cover multiple `scenarioCausalLinkIds`.

### Closure Rule

Every CONFIRMED_DEFECT_READY link is covered exactly once across the consolidated candidate set.

---

# E. REPORT

## E1. Final Bug Contract

### Trigger

Only after Gameplay Defect Resolution.

### Required Fields

```text
Bug ID
Category
Gameplay Stage
Scenario
Severity
Issue
Trigger
Expected
Actual
Player Impact
Technical Cause
Affected Scope
Source Evidence
Reproduction
Root Cause
```

### Admission Rule

A bug enters Proposed Bug Set only when:

```text
Scenario
+
Trigger
+
Expected
+
Actual
+
Broken Dependency
+
Player-visible Consequence
+
Affected Scope
+
Technical Cause
+
Source Evidence
+
Counter-proof Cleared
```

### Reproduction Rule

Reproduction uses tester/gameplay language, not implementation instructions.

### Severity Rule

Assign severity only after defect admission:

- Blocker — required gameplay cannot normally start/continue/complete and recovery is unavailable.
- Major — core gameplay/state/fairness is materially wrong.
- Minor — limited but real player-visible impact.

### Output

Proposed Bug Set → Chat Approval → Approved Bug Set → Production Bug Report V2.

### Closure Rule

Only approved confirmed defects enter the canonical production bug report.

---

# Procedure Closure

The base procedure is complete only when:

```text
UNDERSTAND
- artifact integrity closed
- surfaces accounted
- journey reconstructed
- state/ownership/progression accounted

MODEL
- applicable actor/spatial/multiplayer/multi-arena/boundary contracts closed

STRESS
- applicable lifecycle/recovery/cleanup/cross-system scenarios accounted

PROVE
- RIG closed
- contradictions resolved
- counter-proof searched
- root causes consolidated

REPORT
- every proposed bug satisfies Final Bug Contract
```

If any mandatory checkpoint is OPEN, the audit must not claim comprehensive completion.

## Anti-overdevelopment rule

Do not add a new checkpoint, analyzer, registry, or workflow layer merely because a possible bug class can be imagined.

Add capability only when one of these is true:

1. an existing mandatory checkpoint cannot be executed;
2. a required RIG node has a genuine CAPABILITY_GAP;
3. a proven regression demonstrates that current procedure systematically misses a material defect class.

The target is the **minimum complete procedure**, not maximum checklist size.
