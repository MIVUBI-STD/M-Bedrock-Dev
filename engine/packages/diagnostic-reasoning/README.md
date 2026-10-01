# Diagnostic Reasoning

This package compares grounded expected gameplay against actual behavior.

## Audit boundary

Normal audit consumes one scoped Gameplay Contract from the selected map version.

```text
Selected Map Version
→ Gameplay Contract
→ Actual Behavior
→ contradiction / match / ambiguity
```

External design/reference material is ignored in normal audit mode.

## Safety

- missing expected behavior stays ambiguous;
- missing evidence stays insufficient;
- historical detector behavior is calibration only, never current truth;
- runtime evidence does not redefine expected gameplay;
- supported hypothesis does not imply causation.

## Candidate discovery

Candidate discovery requires a matching Gameplay Contract with `READY` or scoped-safe `PARTIAL` readiness.

Candidate families remain intentionally small:

- progression dead-end;
- objective loss;
- reset leakage;
- terminal-state conflict;
- multiplayer ownership conflict;
- critical inventory loss;
- entity route dead-end.

Counter-evidence is fail-closed:

- present → suppress/reclassify;
- unresolved → keep unresolved;
- cleared + material player impact → candidate may continue.

## Status boundary

`confirmed-defect` is evidence state, not approval.

Internal `repair-eligible` / `guarded-repair-eligible` statuses mean causal repair readiness only. Final mutation authority remains Approved Bug/design change + Repair Contract.

Severity remains owned by the bug-report decision layer.