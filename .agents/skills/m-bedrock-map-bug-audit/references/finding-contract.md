# Finding Contract

Used by **Map Bug Audit**.

## Audit header

```text
Selected Artifact
Map Version
Evidence Scope = selected-map-version-only
Archive Sources Used = false
```

## Surface accounting

Every discovered gameplay surface must have exactly one record:

```text
Subject
Kind
Status = checked | blocked | not-applicable
Candidate IDs, if any
Reason, required when blocked
```

`accounted` means every **discovered** surface has a record. It does not prove all map mechanics were discovered.

## Candidate

Every candidate records:

```text
Subject IDs
Disposition
Expected Authority = selected-artifact
Evidence
Player Impact
Counter-Evidence
Tester Trigger Ready
Proof Ceiling
Severity, defect only
```

Decision order:

```text
Selected Map Version
→ Gameplay Contract
→ Actual Behavior
→ Contradiction
→ Counter-Evidence
→ Player Impact
→ Tester Trigger
→ Defect
→ Severity
```

## Reportable defect

Requires all of:

- grounded contradiction;
- cleared counter-evidence;
- player-visible impact (`blocking`, `material`, or `limited`);
- tester-verifiable in-game trigger.

All confirmed defects are shown by default: Blocker, Major, and Minor.

Production BUG / DESIGN_MISMATCH output is confirmation-only. Do not emit `Needs Validation`, `Ambiguous`, or `Detection Gap` as pseudo-issues.

Unresolved work is routed internally as an exact targeted test obligation:
- `runtime-proof-required` → one narrow runtime falsification test;
- `insufficient-evidence` → test only the missing predicate/dependency;
- `ambiguous-intent` → keep outside the issue report until selected-artifact evidence resolves expected behavior;
- `detection-gap` → one narrow tester action tied to the unresolved causal dependency.

A source-proven contradiction with a complete gameplay translation is automatically challenged by bounded counter-proof search. It must resolve to either `CONFIRMED_DEFECT_READY` or `BLOCKING_COUNTERPROOF`; it must not be parked in a generic validation state.

Designed behavior, disproven candidates, and normal surfaces remain hidden.