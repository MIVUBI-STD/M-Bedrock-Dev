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
