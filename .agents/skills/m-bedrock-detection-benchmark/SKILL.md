---
name: m-bedrock-detection-benchmark
description: >
  Measure bug-detection correctness, coverage, and regression against frozen expectations. Use for detector evaluation; not production implementation changes or map auditing.
---

# M-Bedrock Detection Benchmark

**Lane:** EVALUATION / DETECTION REGRESSION

## Purpose

Measure bug-detection correctness and coverage against frozen expectations.

This lane does not modify production capability and does not deliver a production-map Bug Report.

## Entry criteria

Use when there is a frozen fixture/corpus expectation or a Detection Capability Delta requiring verification.

## Allowed actions

- execute current detection capability;
- compare expected and observed results;
- measure false positives / false negatives;
- measure semantic/proof coverage;
- preserve known expected failures;
- measure execution/context/token cost when useful.

## Forbidden actions

- modify production analyzer/rule/knowledge code;
- modify the target map;
- rewrite expectations to match current output;
- treat benchmark findings as production Bug Report findings;
- silently start Detection Development.

## Benchmark pipeline

```text
Frozen fixture/corpus expectation
→ execute current capability
→ compare
→ classify mismatch
→ coverage/regression summary
→ development handoff if needed
→ STOP
```

## Result classes

- `pass`
- `false-negative`
- `false-positive`
- `semantic-mismatch`
- `evidence-insufficient`
- `runtime-proof-required`
- `fixture-invalid`

## Output contract

```text
Benchmark Result
Fixture/corpus identity
Frozen expectation
Observed result
Result class
Detection coverage
Proof coverage
Regression status
Performance/context note (optional)
Development handoff (optional)
```

## Handoff

A reusable mismatch may hand off to `m-bedrock-detection-development`.

Benchmark never automatically resumes Map Bug Audit.

## STOP

Stop after the frozen expectation has a result class and any reusable mismatch has a bounded handoff.


## Reference routing

Load only when relevant:

- `references/benchmark-expectation.md` — frozen expectation format and mismatch interpretation;
- `references/corpus-rules.md` — corpus validity, privacy, and regression stability.

Benchmark references define evaluation only; they do not authorize production changes.
