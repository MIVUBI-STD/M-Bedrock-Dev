# M-Bedrock Capability Benchmark

**Lane:** EVALUATION / REGRESSION

Use to measure whether bug-finding capability improved, regressed, or remains incomplete.

This skill evaluates capability. It does not modify production engine behavior and does not audit a production map for delivery.

## Goal

Measure:

- expected findings recovered;
- false negatives;
- false positives;
- ambiguous/unsupported cases;
- evidence ceiling;
- regression stability;
- runtime-proof dependence;
- execution/token/context cost when relevant.

## Benchmark pipeline

```text
Frozen fixture/corpus expectations
→ execute current capability
→ compare expected vs observed
→ classify mismatch
→ summarize coverage/regression
→ produce development handoff if needed
→ STOP
```

## Non-negotiable rules

- Never rewrite expected results merely to make the current engine pass.
- Never treat a production map as the only regression oracle.
- Separate detection coverage from runtime proof coverage.
- Separate semantic correctness from speed/token efficiency.
- Preserve known expected failures explicitly.
- Benchmark output is evidence for development; it is not a Bug Report.

## Result classes

- `pass`
- `false-negative`
- `false-positive`
- `semantic-mismatch`
- `evidence-insufficient`
- `runtime-proof-required`
- `fixture-invalid`

If a reusable capability change is required, hand off to `m-bedrock-capability-development`.
