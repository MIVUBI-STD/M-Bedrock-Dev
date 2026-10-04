# Detector Quality Metrics

Detection Development and Detection Benchmark evaluate quality, not raw finding count.

Minimum confusion-matrix metrics:

- TP — expected defect correctly detected;
- TN — expected non-defect correctly left unreported;
- FP — non-defect incorrectly reported;
- FN — expected defect missed;
- Unknown — unresolved cases tracked separately instead of being forced into pass/fail;
- Precision = TP / (TP + FP);
- Recall = TP / (TP + FN);
- Specificity = TN / (TN + FP);
- False-positive rate = FP / (FP + TN).

Also record when material:

- proof-strength delta;
- minimum evidence tier before/after;
- runtime-cost delta;
- context/token delta;
- new ambiguity introduced;
- severity/disposition drift.

Quality rules:

- higher recall does not justify a material precision or specificity collapse;
- unresolved/runtime-only cases do not count as defects unless their proof ceiling is met;
- acceptance cases must be scored from frozen expectations;
- known-good cases are first-class evidence, not optional examples;
- aggregate metrics must not hide a severe domain-specific regression.

A detector change is evaluated against the previous baseline and frozen corpus. Do not invent a universal pass threshold before enough real-map evidence exists.


## Conservation metrics

For full-map audits, also record:

- material candidates discovered;
- candidates with explicit final disposition;
- silently lost candidates;
- PROVEN findings projected;
- NEED_VALIDATION findings projected;
- explicit rejected/superseded/excluded candidates.

`silent finding loss` is a quality failure independent of precision/recall. Approval or report filtering must not reduce the disposition denominator.

Track delivery-state coverage for applicable gameplay dependencies:

```text
declared / materialized / active / owned / simulated / completed-or-released
```

A detector does not receive coverage credit for a later delivery state merely because an earlier configuration state was observed.
