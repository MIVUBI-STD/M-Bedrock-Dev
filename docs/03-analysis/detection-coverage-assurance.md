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

# 18. Architecture Freeze Rule

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
