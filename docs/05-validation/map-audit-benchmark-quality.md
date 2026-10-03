# Detection Benchmark — Map Audit Quality Mapping

## Purpose

Measure detector correctness without rewarding overclaiming.

## Accuracy layer

Use the existing benchmark result classes:

- pass
- false-negative
- false-positive
- semantic-mismatch
- evidence-insufficient
- runtime-proof-required
- fixture-invalid

## Public status mapping

The production audit exposes only:

- PROVEN
- NEED_VALIDATION

A NEED_VALIDATION result is **not** automatically a false negative.

It is acceptable only when the frozen expectation explicitly permits unresolved proof at the configured evidence ceiling:

```text
expected.publicStatus = NEED_VALIDATION
expected.validationAllowed = true
```

If the frozen expectation requires PROVEN and the current detector returns NEED_VALIDATION despite sufficient selected-artifact proof being available, classify the benchmark result as evidence-insufficient or false-negative according to whether the expected defect was semantically detected.

## Issue type mapping

Frozen expectations may specify:

- BUG
- DESIGN_MISMATCH

Correct subject with the wrong issue type is a semantic mismatch.

## Quality metrics

In addition to TP/TN/FP/FN, record when available:

```text
auditQuality.proven
auditQuality.needValidation
auditQuality.runtimeResidue
auditQuality.validationTestCount
auditQuality.honestyStatus
```

Derived:

```text
provenRate
needValidationRate
runtimeResidueRate
```

For repeated arenas, optionally record:

```text
fullMapReplica.equivalent
fullMapReplica.divergenceRequiresClassification
fullMapReplica.incompleteProof
```

## Honesty rule

A benchmark run with `honestyStatus = VIOLATION` cannot be considered a clean pass even when the expected finding itself was detected.

## Anti-gaming rule

Do not maximize PROVEN rate by weakening proof requirements.

Preferred direction:

```text
higher recall
+ stable precision
+ higher PROVEN rate
+ lower NEED_VALIDATION/runtime residue
+ honesty PASS
```

not:

```text
more PROVEN
by converting unresolved evidence into unsupported certainty
```
