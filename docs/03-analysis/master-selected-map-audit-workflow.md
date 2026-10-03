# Master Selected-Map Audit Workflow

## Purpose

This is the operator-facing master sequence for one complete selected-map audit.

It does not replace executable owners. Authority remains:

~~~
runSelectedMapAudit()
→ mandatory-audit-procedure.ts
→ map-audit-admission.ts
→ scenario / proof owners
~~~

Use this document to know what happens next, what must exist before moving on, and where specialist evidence feeds the same canonical flow.

---

# 0. One-door entry

~~~
audit <selected.mcworld>
~~~

Only one selected artifact/version is authoritative.

Do not mix:
- old map versions;
- Development/Source references;
- historical QA;
- archived reports;
- external design assumptions.

Historical material may create search pressure only. It cannot define current gameplay truth.

---

# 1. TARGET — lock the exact artifact

## Goal
Know exactly what is being audited.

## Required work

~~~
selected .mcworld
→ version / identity
→ pack identities
→ file inventory
→ artifact fingerprint
→ runtime profile
~~~

## Must resolve
- exact map/version;
- behavior/resource packs belonging to it;
- platform/edition/version;
- no stale/foreign source mixed into gameplay authority.

## Exit

~~~
TARGET CLOSED
→ continue to DISCOVERY
~~~

If identity is ambiguous, stop publication.

---

# 2. DISCOVERY — find every material gameplay surface

## Goal
Prevent a bug from disappearing before modeling begins.

## Sources
Inspect all applicable selected-artifact evidence:

~~~
scripts
functions
entities
structures
dialogue / UI
commands
scoreboards
tags
dynamic properties
world DB / native records
Semantic IR
~~~

## Core outputs

~~~
Gameplay Surface Inventory
+ raw Semantic IR evidence
+ unsupported / parse residue
+ Discovery Challenger signals
~~~

## Discovery Challenger

After normal discovery, challenge the result from the opposite direction:

~~~
raw executable/state evidence
→ does it have a semantic owner?
→ does it belong to a scenario?
→ does it have a gameplay purpose?
~~~

Challenge:
- state operations with no semantic owner;
- execution regions with no gameplay owner;
- unresolved execution edges;
- deferred/periodic work with no lifecycle owner;
- unsupported dynamic commands/effects.

## Exit rule
Every material raw/discovered surface is:
- understood;
- explicitly blocked / unknown;
- or not applicable with evidence.

Nothing material silently disappears.

---

# 3. UNDERSTAND — reconstruct how the game actually works

## Goal
Turn surfaces into one coherent gameplay model.

## 3.1 Player Journey

Reconstruct in player-flow order:

~~~
ENTRY / JOIN
→ READY / START
→ SETUP
→ ACTIVE GAMEPLAY
→ PROGRESSION
→ TERMINAL
→ CLEANUP / REPLAY
→ RECOVERY
~~~

For every applicable stage record:
- Entry condition
- Owner
- Required state/components
- Action
- Success condition
- Failure condition
- Next stage
- Cleanup / recovery

## 3.2 State Registry

For every material state:

~~~
State
Scope
Created by
Read by
Written by
Cleared by
Lifetime
Persistence
Stale-state risk
~~~

## 3.3 Reverse Shared-Resource Ownership

Build:

~~~
resource
→ every reader
→ every writer
→ every clearer
→ every deferred writer
~~~

Challenge:
- multiple writers without authority;
- deferred writer without generation proof;
- 3+ regions converging on the same resource;
- global state used by arena-local gameplay.

This is also the selector for higher-order interaction testing.

## 3.4 Ownership Registry

For each mutable owner:

~~~
Owner
Owner ID
Generation / revision
Acquire
Validate
Release
Owned resources
Owner disappearance behavior
~~~

## 3.5 Progression Contract

For every wave/objective/level/mechanic:

~~~
Trigger
→ Condition
→ Tracker
→ Mutation
→ Completion
→ Transition
~~~

No required work may escape completion accounting.

## Exit
UNDERSTAND is closed only when journey, state, ownership, and progression are grounded or explicitly unresolved.

---

# 4. MODEL — build complete gameplay contracts

## Goal
Model the systems that must be correct before stress/proof.

## Core contracts

~~~
Actor / Entity
Spatial / Simulation
Multiplayer
Multi-Arena
Boundary
Capability Delivery
~~~

## 4.1 Full-map / world-DB replica normalization

When repeated arenas/regions exist, do not full-audit every arena independently.

Canonical subflow:

~~~
world DB / topology
+ source / config layout
→ detect replicas
→ normalize relative coordinates
→ choose canonical baseline
→ compare topology / spatial fingerprints
→ compare voxel / block-entity / native proof when available
→ reconcile world DB vs source/config
→ classify replica proof
→ build FullMapReplicaReceipt
→ classify delta
~~~

Canonical full-map naming:

- `replicaBaseline`
- `replicaResults[]`
- `replicaId`
- `replicaStatus`
- `replicaDivergenceIds[]`
- `baselineReusableForAllReplicas`

Replica result:

~~~
EQUIVALENT
→ baseline may be reused for that replica

DIVERGENCE_REQUIRES_CLASSIFICATION
→ classify semantic/gameplay relevance
→ send only grounded material consequence to STRESS / PROVE

incomplete / no proof
→ MODEL remains PARTIAL
~~~

Never:
- assume physical arenas are gameplay-equivalent;
- assume source equality means world equality;
- duplicate one root-cause bug for every equivalent replica;
- inherit baseline safety into a diverged/unproven replica.

## 4.2 Actor / Entity Contract

Trace:

~~~
spawn
→ simulation
→ target
→ navigation
→ interaction/combat
→ death/remove
→ progression accounting
→ cleanup
~~~

## 4.3 Spatial / Simulation Contract

Trace:

~~~
gameplay dependency
→ required region
→ residency/ticking owner
→ readiness
→ capacity
→ release
~~~

Use platform knowledge and evidence substitution before runtime.

## 4.4 Multiplayer / Multi-Arena

Resolve:
- assignment
- capacity
- parallel start
- state isolation
- selector isolation
- entity isolation
- world mutation isolation
- reward/message/audio isolation
- cleanup
- reuse

For boundaries:
- 1
- 2 where concurrency exists
- safe limit
- safe limit + 1
- selected-map maximum

Compound shared-capacity boundaries may add selected combinations such as:
- arena count × players
- arena count × ticking resources
- wave count × entity count

Do not brute-force unrelated combinations.

## 4.5 Capability Delivery

Compare:

~~~
what the game presents
vs
what source implements
vs
what is actually playable
~~~

This separates BUG from DESIGN_MISMATCH without treating platform constraints as excuses that erase player-visible mismatch.

---

# 5. STRESS — attack lifecycle and cross-system failure paths

## Goal
Find failures that do not appear in the happy path.

Stress only applicable systems.

## Required families
- combat lifecycle
- inventory / equipment
- reward / economy
- persistence / reconnect / reload
- entity lifecycle
- chunk simulation
- world / structure mutation
- terminal collision
- cleanup / reuse
- deferred ownership
- boundaries

## Negative-space challenges

Always challenge applicable inverse pairs:

~~~
Acquire   → Release
Reserve   → Free
Lock      → Unlock
Spawn     → Death/remove accounting
Increment → Decrement/consume
Grant     → Clear/restore/reset
Persist   → Restore/reset
Schedule  → Cancel/revalidate
Create    → Cleanup
~~~

## Higher-order interaction

Do not Cartesian-product every subsystem.

Use the shared-resource reverse index:

~~~
same material resource
+ multiple writers
+ lifecycle boundary
+ temporal overlap
→ generate bounded interleaving
~~~

## Repeated-run / growth

Prefer static growth reasoning:

~~~
producer per run
> cleanup / consumer per run
→ accumulation candidate
~~~

Examples:
- dynamic-property append without clear;
- ticking acquire/release imbalance;
- world drop without cleanup;
- entity/state residue.

---

# 6. PROVE — maximize PROVEN before asking a tester

## Goal
Turn every material candidate into exactly:
- PROVEN
- NEED_VALIDATION

No other public status.

## 6.1 Proof navigation

Every NEED_VALIDATION receives:
- proofGoal
- provenClaims[]
- missingClaims[]
- ordered proof route[]
- historicalSearchHints[]
- evidenceSubstitutions[]
- familyProofCriteria[]

Search order:

~~~
selected-artifact evidence
→ cross-domain evidence
→ historical search pressure
→ evidence substitution
→ formal / quantitative proof
→ counter-proof
→ runtime last resort
~~~

## 6.2 Historical search pressure

Past defects may only:
- raise search priority;
- add questions;
- move relevant knowledge earlier.

They may not prove the current bug.

## 6.3 Evidence substitution

Before runtime, try deterministic substitutes.

Examples:

Arena capacity:
- visible count
- safe count
- player-facing presentation

Chunk simulation:
- gameplay dependency
- geometry/location
- residency owner
- platform constraint

Inventory:
- competing writers
- same scope
- no idempotency/exclusion/generation guard

Persistence:
- append
- finite lifecycle
- no clear

Structure residue:
- previous footprint
- next footprint
- uncovered cells

Runtime demonstrates manifestation only when source proof cannot decide semantics.

## 6.4 Counter-proof

A candidate may be suppressed only by real blocking proof.

Counter-proof must cover applicable dimensions:
- guard
- scope
- exclusion
- owner
- generation
- cleanup

Nearby healthy code is not counter-proof.

A guard/exclusion must apply to the exact contradicted dependency / commit target.

## 6.5 Proof saturation

Stop searching once sufficient proof is complete.

Universal minimum:

~~~
grounded scenario
+ grounded contradiction
+ explicit trigger
+ player-visible consequence
+ Expected / Actual
+ affected scope
+ evidence
+ exhaustive bounded counter-proof
+ NO_BLOCKING_PROOF
~~~

Use `familyProofCriteria[]` as the domain-specific checklist and bind the satisfied criteria through `FamilyProofReceipt`. PROVEN requires both universal saturation and all applicable family criteria to be satisfied with concrete evidence.

When saturated:

~~~
→ PROVEN
→ STOP
~~~

Do not request runtime merely for reassurance.

---

# 7. Runtime residue — only irreducible behavior

Runtime is allowed when behavior cannot safely be decided statically.

Examples:
- native pathfinding/collision;
- actual entity simulation;
- client/server ordering;
- multi-client visual divergence;
- rendering/input;
- load/performance manifestation.

Each unresolved item gets exactly one narrow question.

Never produce a broad manual-testing matrix as a substitute for diagnosis.

---

# 8. Honesty / non-suppression gate

Before review, independently cross-check all material residue.

The visible issue set must contain:

~~~
every confirmed defect → PROVEN
every material unresolved residue → NEED_VALIDATION
~~~

Cross-check includes:
- runtime blocked;
- detection gaps;
- unresolved knowledge;
- unknown/blocked closure surfaces;
- negative-space signals;
- high temporal risks;
- Discovery Challenger signals;
- shared-resource ownership signals;
- higher-order interactions;
- incomplete replica proof.

Any missing visible finding:

~~~
honesty = VIOLATION
→ audit = BLOCKED
~~~

---

# 9. REPORT — one clean final projection

## Single-output rule

Production audit has exactly one operator-facing output:

```text
audit <selected.mcworld>
→ SelectedMapAuditRun (internal authority)
→ Map Audit Output V2 (operator output)
```

Do not expose raw `SelectedMapAuditRun`, Work Session state, analyzer receipts, model task packets, or specialist projections as parallel production outputs. They remain internal evidence/control-plane data.

## Review-readiness rule

`READY_FOR_REVIEW` means the finding set is complete and honest, not that every finding is PROVEN. NEED_VALIDATION may remain when its exact missing proof and validation action are preserved. Additional proof-navigation tasks after review readiness are optional promotion work, not a second audit lane.


## Issue lanes
- BUG
- DESIGN_MISMATCH

Each visible finding is only:
- PROVEN
- NEED_VALIDATION

## PROVEN requires
- sufficient proof saturation;
- cleared counter-proof;
- player impact;
- exact scope;
- tester-ready reproduction.

## NEED_VALIDATION requires
- why not proven;
- evidence already present;
- exact missing proof;
- exact targeted test;
- no final severity.

## Presentation

Operator timing rule:
- `currentStage`, `allowedNextAction`, continuation owner, and blocking checkpoint IDs must surface in the Map Audit Report because they determine what the operator does next;
- proof-navigation guidance must surface on NEED_VALIDATION findings, but may remain collapsed;
- game-design / multi-arena / gameplay-closure / honesty / replica context may remain collapsed as Audit Context;
- `modelTaskPackets`, raw `executionTrace`, and Work Session persistence are internal control-plane data and must not be duplicated into human-facing HTML unless a proven user need appears.

Chat:
- concise issue list only.

HTML:
- tester checklist;
- reproduce;
- expected;
- bug proven when;
- reproduced / not reproduced / blocked;
- evidence/note.

Approved Bug Report V2:
- PROVEN BUG items only.

Design Mismatches and NEED_VALIDATION remain visible in Map Audit output/report handoff.

---

# 10. Final closure

A selected-map audit is complete only when:
- TARGET closed
- DISCOVERY complete
- UNDERSTAND closed
- MODEL closed
- full-map replica proof complete/bounded or divergence explicitly carried
- STRESS applicable families accounted
- PROVE accounted: every material finding is PROVEN or explicitly NEED_VALIDATION with exact missing proof
- honesty PASS
- REPORT handoff preserves all visible unresolved work

A clean happy path is never sufficient.

---

# Operator summary

1. Select exact map
2. Discover everything
3. Challenge what discovery missed
4. Reconstruct player journey
5. Build state / ownership / progression model
6. Build shared-resource reverse index
7. Normalize full map / arena replicas from world DB
8. Reconcile world vs source/config
9. Reuse equivalent baseline proof; classify replica divergence before routing any gameplay-material consequence
10. Stress lifecycle / boundaries / cross-system interactions
11. Navigate every issue toward proof
12. Search counter-proof
13. Stop at proof saturation
14. Use runtime only for irreducible residue
15. Run honesty gate
16. Publish BUG / DESIGN_MISMATCH with PROVEN / NEED_VALIDATION

---

# Naming

Use `map-audit-naming-contract.md` for canonical public terms. Do not introduce alternate public status or field names.

# Specialist owners

Use these for detail, not alternate flow authority:

- mandatory-audit-procedure.md — executable checkpoint contract
- audit-execution-flow.md — player-flow projection
- multi-arena-audit-contract.md — capacity/isolation + replica detail
- audit-finalization-checklist.md — publication review
- current-validation.md — current source truth / proof limits

This master flow is the navigation layer; executable code owners remain authoritative.
