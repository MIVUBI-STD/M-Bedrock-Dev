# Benchmark Expectation

A Detection Benchmark expectation must be frozen before evaluating the changed detector.

```text
Expectation ID
Fixture/corpus identity
Target edition/version
Input evidence
Expected result class
Expected finding/disposition
Expected proof ceiling
Known unsupported residue
Reason / provenance
```

Do not encode implementation details that are not part of observable behavior.

## Mismatch interpretation

- missing expected finding → `false-negative`
- unexpected unsupported finding → `false-positive`
- right subject, wrong semantics → `semantic-mismatch`
- semantics correct but proof too weak → `evidence-insufficient`
- static ceiling correctly stops before runtime → `runtime-proof-required`
- expectation/source is invalid or stale → `fixture-invalid`
