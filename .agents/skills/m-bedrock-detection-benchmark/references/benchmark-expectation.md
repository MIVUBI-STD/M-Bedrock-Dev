# Benchmark Expectation

A Detection Benchmark expectation must be frozen before evaluating the detector under test.

Canonical machine contract:

```text
../../schemas/benchmark-expectation.schema.json
```

Minimum identity:

```text
Expectation ID
Corpus lane
Artifact label
Artifact SHA-256
Map version when known
Target edition
Target Minecraft version
Expected disposition
Expected finding/domain when applicable
Expected proof ceiling
Reason / provenance
Frozen-before-run marker
```

Do not encode implementation details that are not part of observable behavior.

## Expected dispositions

- `defect`
- `designed-behavior`
- `ambiguous-intent`
- `insufficient-evidence`
- `runtime-proof-required`

A negative case normally expects `designed-behavior` or another explicit non-defect disposition; it must not be represented by simply omitting expectations.

## Blind acceptance

For `acceptance` cases:

1. verify artifact identity;
2. run detector without exposing expected semantics;
3. freeze observed output;
4. reveal expectation;
5. score.

## Mismatch interpretation

- missing expected defect → `false-negative`
- unexpected defect on a known-good case → `false-positive`
- right subject, wrong semantics → `semantic-mismatch`
- semantics correct but proof too weak → `evidence-insufficient`
- static ceiling correctly stops before runtime → `runtime-proof-required`
- expectation/source identity is invalid or stale → `fixture-invalid`
