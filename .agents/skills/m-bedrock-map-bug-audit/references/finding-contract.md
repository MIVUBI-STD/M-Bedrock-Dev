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
- material player-visible impact;
- tester-verifiable in-game trigger.

Blocker/Major are shown by default. Minor stays hidden unless requested.

Unknown intent, missing evidence, runtime-only residue, or detection gaps remain internal and never receive defect severity.