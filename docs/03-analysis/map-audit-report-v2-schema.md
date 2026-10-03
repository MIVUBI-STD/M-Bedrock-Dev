# Map Audit Report V2 Schema

## Purpose

Defines the production audit model after Game Design First analysis.

## Required audit model

```text
World Artifact
→ Evidence Scope
→ Gameplay Surface Inventory
→ Gameplay Discovery Closure
→ Game Design Model
→ Gameplay Flow + State Closure
→ Boundary / Multi Arena / Capacity / Replica Model
→ Reachability + Capability Exposure
→ Blind-Spot + Cross-System Coverage
→ Gameplay Model Closure
→ BUG Findings
→ DESIGN_MISMATCH Findings
→ Coverage Accounting
→ Closure-gated Production Report
```

## Evidence scope

Current gameplay conclusions must come from the selected artifact only.

The output records:
- selected artifact;
- selected-map-version-only mode;
- archive sources not used as current gameplay authority.

## Game design model

Required understanding:
- objective;
- win condition;
- lose condition;
- reset rules;
- preserve rules;
- progression rules;
- multiplayer rules;
- multi-arena/capacity rules when applicable.

## Coverage accounting

Every applicable audit surface is recorded as:

- checked;
- blocked, with reason; or
- not-applicable, with reason.

Unsupported or unparsed mechanics are reported as Detection Gap.

## Canonical issue taxonomy

Every reportable finding is described on four independent axes:

```text
Issue Type
+ Gameplay Flow
+ Failure Domain
+ Severity
```

### Issue Type

- `BUG`
- `DESIGN_MISMATCH`

### Gameplay Flow

- `ENTRY_JOIN`
- `READY_START`
- `SETUP`
- `ACTIVE_GAMEPLAY`
- `PROGRESSION`
- `TERMINAL`
- `CLEANUP_REPLAY`
- `RECOVERY`

### Failure Domain

- `arena-multi-arena`
- `inventory-economy`
- `progression-wave-objective`
- `chunk-simulation`
- `player-lifecycle`
- `entity-ai-combat`
- `world-structure-mutation`
- `ui-feedback-information`
- `state-ownership`
- `temporal-async`
- `boundary-capacity`
- `persistence-recovery`
- `platform-performance`

`failureDomain` is the primary reader-facing domain. `contributingDomains[]` preserves materially involved cross-system domains for the same root cause.

### Severity

Severity remains independent from issue type/domain and is derived from actual impact:

- Blocker
- Major
- Minor

Do not infer severity merely because an issue belongs to multi-arena, inventory, UI, or another domain.

## Issue type split

Map Audit Output V2 has two distinct confirmed-issue lanes:

### BUG

Use when the selected artifact has a grounded intended behavior/design, but implementation or runtime behavior breaks that intent.

Examples:

- spawn should happen but fails;
- reconnect should restore loadout but does not;
- purchase consumes currency but fails to deliver effect;
- cleanup leaves stale state that corrupts the next run.

### DESIGN_MISMATCH

Use when the capability/design presented by the map does not match what can actually be played or delivered, even if the implementation is internally consistent.

Examples:

- six arenas are presented but only two can run concurrently;
- a visible mechanic or route is offered but the supported capability is materially lower;
- platform/resource constraints make the authored design undeliverable as presented.

Technical constraints are recorded as root cause/constraint evidence. They do not convert a DESIGN_MISMATCH into normal behavior.

A finding must belong to exactly one of these two lanes. Do not duplicate one root cause into both.

## BUG record

Every reportable issue requires:

```text
Bug ID
Issue Type
Failure Domain
Contributing Domains
Gameplay Flow
Status
Issue
Player Impact
Reproduction Steps
Expected Behavior
Actual Behavior
Evidence
Proof Ceiling
```

Confirmed bugs additionally require:
- Blocker / Major / Minor severity;
- cleared counter-evidence;
- tester-ready reproduction.

## DESIGN_MISMATCH record

DESIGN_MISMATCH uses the same evidence, gameplay-flow, severity, reproduction, expected/actual, proof-ceiling, and counter-evidence discipline as BUG.

Additional fields may include:

```text
Mismatch Kind
Technical Constraint
Presented Capability
Playable Capability
```

## Status

Production `bugs[]` and `designMismatches[]` are confirmation-only:

- Confirmed — contradiction proven from the selected artifact and bounded counter-proof search found no blocking proof.

Unresolved work is not serialized as a pseudo-issue. It remains in the audit proof/test queue as a narrow runtime proof request, targeted Detection Gap test, or unresolved intent/evidence obligation until it resolves to Confirmed or is disproven.


## Gameplay Model Closure

- `CLOSED` — discovered surfaces are accounted and material state/boundary understanding is complete.
- `PARTIAL` — discovered surfaces are accounted, but explicitly identified material evidence remains blocked/unknown.
- `OPEN` — one or more discovered surfaces are unaccounted, the major state model is incomplete, or material boundaries are not sufficiently extracted.

`OPEN` may contain non-empty `unaccountedSurfaceIds` and blocks comprehensive production review/publication.

## Advanced coverage

When applicable, coverage includes:

- replica integrity/completeness;
- prerequisite reachability;
- sensitive capability exposure/authorization;
- negative-space and mechanic completeness;
- temporal/cross-system risk;
- repeated-run baseline/reset proof;
- player-facing evidence;
- quantitative/platform constraints.


## Publication precondition

Gameplay Discovery Closure is a production control gate and does not create a second persisted report authority.

Before Map Audit Output V2 is treated as comprehensive:

- Discovery Closure must not be `OPEN`;
- Gameplay Model Closure must not be `OPEN`.

If Discovery Closure is OPEN, report the source/index gap instead of serializing a comprehensive audit claim.
