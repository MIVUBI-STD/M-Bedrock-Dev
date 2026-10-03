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

Every material finding shown to the operator uses exactly one public status:

- `PROVEN` — contradiction is sufficiently proven and blocking counter-proof is cleared. BUG vs DESIGN_MISMATCH remains in `issueType`. PROVEN findings receive final severity.
- `NEED_VALIDATION` — the finding remains materially plausible but final proof is still missing. It stays visible and must include `validationReason`, `missingProof`, and one exact `validationTest`. It must not receive final severity.

Internal causes such as `runtime-proof-required`, `insufficient-evidence`, `ambiguous-intent`, and `detection-gap` are reasons behind NEED_VALIDATION, not additional public status categories.

A source-proven contradiction with a complete gameplay translation is automatically challenged by bounded counter-proof search. It should become PROVEN whenever the selected-artifact evidence is sufficient; only irreducible missing proof remains NEED_VALIDATION.

Designed behavior, disproved candidates, and proven-normal surfaces remain hidden from the finding list but stay in the audit trace.