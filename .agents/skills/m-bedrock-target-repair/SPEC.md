# Target Repair Specification

## Intent

Apply the smallest preconditioned mutation to a target working copy while preserving approved gameplay.

## Bug-repair entry state

```text
Approved Bug
+ violated Gameplay Contract
+ Repair Contract
  - Must Change
  - Must Preserve
```

No Approved Bug means no bug-repair mutation.

Intentional modification is a separate path: change/approve Game Design first when expected gameplay itself changes.

## In scope

- repair-contract interpretation;
- exact target ownership;
- patch transaction;
- rollback/preconditions;
- affected semantic rebuild;
- source/package verification;
- preservation verification;
- explicit runtime residue.

## Out of scope

- inventing intended gameplay;
- silently changing Game Design;
- mutating original artifacts;
- detector development;
- unrelated cleanup.

## Acceptance

- exact target owner is known;
- Must Change maps to the approved defect;
- Must Preserve maps to current Game Design;
- patch has stale-state protection;
- original artifact remains immutable;
- defect verification is rerun;
- preservation verification is rerun;
- runtime proof is not overstated.

A repair is incomplete if the symptom disappears but approved gameplay semantics regress.