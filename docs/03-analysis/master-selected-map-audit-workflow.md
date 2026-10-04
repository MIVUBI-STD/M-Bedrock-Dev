# Master Selected-Map Audit Workflow

## Purpose

This is the operator-facing master sequence for one complete selected-map audit.

It does not replace executable owners. Communication preflight happens before production audit authority:

~~~
raw user request
→ normalized AuditUserIntentEnvelope
→ Pre-Audit Plan shown in chat
→ explicit user confirmation
→ AuditUserIntentConfirmationReceipt
→ runSelectedMapAudit()
→ mandatory-audit-procedure.ts
→ map-audit-admission.ts
→ scenario / proof owners
~~~

The Pre-Audit Plan is a communication gate only. It is not an audit stage, gameplay authority, proof source, or second workflow.

Use this document to know what happens next, what must exist before moving on, and where specialist evidence feeds the same canonical flow.

---

# PRE-AUDIT — confirm scope before production audit

This is a communication gate, not an audit stage or a second state machine.

## Goal

Confirm what the user wants audited and how the audit will work before `TARGET` begins. The user is not expected to know existing bugs or symptoms.

## Pre-Audit Plan

Build one compact plan containing:

```text
Target / selected map hint
Audit objective
Applicable planned gameplay/system checks
Proof strategy
User-requested focus / constraints
Expected output
Optional supplied symptoms / suspicions
Material ambiguities, if any
```

Default planned coverage, when applicable:

- exact selected artifact/version;
- complete player journey;
- gameplay surfaces and ownership;
- progression/wave/objective completion;
- terminal transitions and recovery/softlock;
- state lifecycle, cleanup, replay, deferred work;
- multiplayer/multi-arena concurrency, isolation, capacity, cleanup, reuse;
- inventory/loadout/economy;
- entity/combat/navigation;
- ticking/residency/simulation;
- persistence/reconnect/reload;
- world/structure mutation;
- boundaries/capacity;
- player-facing information/capability;
- cross-system interactions and counter-proof.

## Confirmation

```text
raw user request
→ Pre-Audit Plan
→ user confirms/corrects
→ confirmation receipt
→ TARGET
```

One explicit confirmation is sufficient. If scope or interpretation changes materially, regenerate and reconfirm the plan.

Confirmation proves only that the planned work matches user intent. It never proves gameplay truth, Expected/Actual behavior, issue type, severity, or proof state.

Do not ask the user to invent symptoms.

---

# Audit terminology

The master workflow uses the same vocabulary as the Mandatory Gameplay Audit Procedure:

- **Check** — applicable integrity analysis.
- **Contract** — expected lifecycle/state relationship.
- **Crosscheck** — targeted interaction analysis between applicable systems.
- **Contradiction** — grounded violation of an expected contract.
- **Blocking Proof** — evidence that prevents the suspected contradiction.
- **PROVEN** — sufficient proof for a reportable finding.
- **NEED_VALIDATION** — one exact remaining proof question that cannot be resolved from available selected-artifact evidence.
- **Audit Obligation** — unresolved audit/model/proof work, not an issue status.
- **Runtime Verification** — narrow in-game confirmation used only for irreducible behavior.

Issue type and proof state are separate:

```text
Issue Type:   BUG | DESIGN_MISMATCH
Proof State:  PROVEN | NEED_VALIDATION
```

Do not introduce alternate names for these states in operator or tester-facing output.

---

# 0. One-door entry

~~~
confirmed Pre-Audit Plan
→ audit <selected.mcworld>
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

## Detection coverage authority

`detection-coverage-assurance.md` owns the coverage-accounting mechanism used across DISCOVERY → UNDERSTAND → MODEL → STRESS → PROVE.

Its Coverage Ledger and Coverage Completeness Gate ensure every material discovered surface is routed, checked, and closed. Its regression corpus is search pressure only and never current-artifact proof.

This is part of the same canonical audit flow, not a second workflow.

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

## Adversarial gameplay QA

For applicable player-controlled surfaces, STRESS also asks how ordinary reachable actions can intentionally pressure or violate the authored gameplay contract.

Use the Adversarial Player Abuse Model from `detection-coverage-assurance.md`.

Focus on bounded gameplay-integrity goals such as:
- skip required progression;
- duplicate or retain managed state;
- cross player/arena ownership boundaries;
- replay one-shot commits;
- race legitimate actions at lifecycle boundaries;
- hold shared resources;
- leave orphaned state/resources;
- turn an ordinary recoverable failure into a softlock.

Generate only sequences supported by the selected artifact and ordinary gameplay actions. This is source-based adversarial QA, not a claim that Minecraft was executed and not an assumption of external cheats or modified clients.

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
Separate unresolved audit work from actual gameplay findings.

```text
raw risk / detection gap / model gap / runtime unknown
→ Audit Obligation
→ causal gameplay translation + counter-proof
→ NEED_VALIDATION finding when confirmation-ready but proof saturation is incomplete
→ PROVEN when minimum sufficient proof is saturated
```

`Audit Obligation` is not an issue status and does not enter BUG / DESIGN_MISMATCH lanes.

## Proof-maximization sequence

For every admitted contradiction, use the coverage-assurance proof sequence:

```text
Referential Integrity where applicable
→ Causal Slicing
→ Claim-Based Proof
→ Blocking-Proof Search
→ Formal Absence / Temporal Proof where applicable
→ deterministic Proof Substitution
→ NEED_VALIDATION Promotion Matrix
→ Runtime Verification only for the final irreducible claim
```

Required claim closure:

```text
Reachability
Contract
Contradiction
Player Consequence
Affected Scope
Blocking Proof Cleared
```

Do not replace claim closure with a generic confidence score.

## 6.0 Proof-promotion rule

The audit should not treat NEED_VALIDATION as a comfortable resting state.

Before a gameplay finding remains NEED_VALIDATION, the proof owner must record why each applicable earlier proof route failed to decide the contradiction.

Required promotion record:

```text
finding
→ exact missing claim
→ selected-artifact search attempted
→ cross-domain search attempted
→ applicable formal / quantitative proof attempted
→ exact counter-proof search attempted
→ result of each attempt
→ smallest remaining deciding question
```

A finding may remain NEED_VALIDATION only when the remaining question is genuinely irreducible from available selected-artifact evidence.

Do not retain NEED_VALIDATION merely because:
- runtime would be convenient;
- source evidence is distributed across files/domains;
- the first search did not find a direct statement;
- proof requires arithmetic, ownership reconstruction, lifecycle interleaving, or negative-space reasoning;
- the issue resembles a historical defect but current proof has not yet been assembled.

For applicable checks, actively try deterministic promotion:

- multi-arena / capacity → visible capacity + lease/resource budget + admission logic + safe limit;
- ticking / simulation → remote dependency + region geometry + residency owner + readiness/release;
- inventory → all writers/clearers across fresh-session, reconnect, loadout, shop, death, reset;
- progression / waves → required work + pending accounting + retry ownership + completion gate;
- reconnect → pre-disconnect owner + persisted state + reconnect writers + delayed/deferred writers;
- cleanup / reuse → old generation writers + publication of reusable state + release timing;
- cross-arena isolation → global selectors/tags/state + arena-local owner + cleanup/mutation scope;
- terminal collision → every terminal trigger + guards + idempotency + ordering window.

If deterministic promotion succeeds, move the finding to PROVEN and stop. If it fails, preserve only the narrow remaining test needed to decide it.

## 6.1 Proof Navigation

Every confirmation-ready NEED_VALIDATION finding receives:
- proofGoal
- provenClaims[]
- missingClaims[]
- ordered proof route[]
- historicalSearchHints[]
- evidenceSubstitutions[]
- checkProofCriteria[]

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

## 6.2 Historical Search Pressure

Past defects may only:
- raise search priority;
- add questions;
- move relevant knowledge earlier.

They may not prove the current bug.

## 6.3 Evidence Substitution

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

## 6.4 Counter-Proof

A candidate may be suppressed only by real blocking proof.

Counter-Proof must cover applicable dimensions:
- guard
- scope
- exclusion
- owner
- generation
- cleanup

Nearby healthy code is not counter-proof.

A guard/exclusion must apply to the exact contradicted dependency / commit target.

## 6.5 Proof Saturation

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

Use `checkProofCriteria[]` as the domain-specific checklist and bind the satisfied criteria through `CheckProofReceipt`. PROVEN requires both universal saturation and all applicable check criteria to be satisfied with concrete evidence.

When saturated:

~~~
→ PROVEN
→ STOP
~~~

Do not request runtime merely for reassurance.

---

# 7. Runtime Verification — only irreducible behavior

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

The visible audit output must contain:

~~~
every confirmed saturated defect → PROVEN finding
every confirmation-ready unsaturated defect → NEED_VALIDATION finding
every unresolved risk / gap / unclassified residue → Audit Obligation
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

Any tracked material residue missing from both findings and Audit Obligations:

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

Each gameplay finding is only:
- PROVEN
- NEED_VALIDATION

Separate non-finding work:
- `auditObligations[]` — unresolved audit/model/proof work with no justified BUG / DESIGN_MISMATCH classification yet.

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
- one compact row per finding/bug;
- `See details` / collapse behavior;
- `How to Reproduce`;
- `Observed`;
- `Expected`;
- per-bug `Fixed` checkbox only on Approved Bug Report HTML;
- proof guidance / evidence context only when relevant and preferably collapsed.

Approved Bug Report V2:
- PROVEN BUG items only.

Design Mismatches and confirmation-ready NEED_VALIDATION findings remain visible in Map Audit output/report handoff. Audit Obligations remain visible separately and never enter Approved Bug Report V2.

---

# 10. Final closure

A selected-map audit is complete only when:
- TARGET closed
- DISCOVERY complete
- UNDERSTAND closed
- MODEL closed
- full-map replica proof complete/bounded or divergence explicitly carried
- STRESS applicable checks accounted
- PROVE accounted: every causal finding is PROVEN or confirmation-ready NEED_VALIDATION, while unresolved non-finding residue remains explicit in Audit Obligations
- honesty PASS
- REPORT handoff preserves all visible unresolved work

A clean happy path is never sufficient.

---

# Operator summary

1. Translate the user request without inventing symptoms.
2. Build the Pre-Audit Plan: objective, what will be checked, proof strategy, user focus/constraints, and output.
3. Show the plan in chat and obtain one explicit confirmation.
4. Lock the exact selected map/version.
5. Discover every material gameplay surface.
6. Challenge what discovery missed.
7. Reconstruct the complete player journey.
8. Build state, ownership, progression, and recovery models.
9. Build the shared-resource reverse index.
10. Normalize repeated map/arena replicas and classify divergence.
11. Reconcile world/topology evidence with source/config evidence.
12. Stress lifecycle, boundaries, concurrency, replay, and cross-system interactions.
13. Resolve contradictions, search blocking counter-proof, and stop at proof saturation.
14. Use runtime only for irreducible behavior.
15. Run the honesty/non-suppression gate.
16. Publish causal BUG / DESIGN_MISMATCH findings and separate Audit Obligations for unresolved non-findings.

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
