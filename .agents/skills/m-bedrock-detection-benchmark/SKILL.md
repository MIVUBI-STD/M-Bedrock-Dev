---
name: m-bedrock-detection-benchmark
description: >
  Measure bug-detection correctness, coverage, and regression against frozen expectations. Use for detector evaluation; not production implementation changes or map auditing.
---

# M-Bedrock Detection Benchmark

**Lane:** EVALUATION / DETECTION REGRESSION

## Purpose

Measure detector correctness and proof coverage against frozen expectations without changing production capability.

## Entry criteria

Use only when a frozen expectation exists. For real-map scoring, artifact identity and SHA-256 must be verified first.

Corpus lanes:

- `calibration` — may inform detector development;
- `acceptance` — blind/holdout evaluation; must not inform implementation before scoring;
- `regression` — minimized bug-specific evidence retained after a reproduced failure.

Canonical manifests live under `engine/reliability/corpus/`.

## Allowed actions

- execute current detection capability;
- compare expected vs observed;
- classify TP/TN/FP/FN and semantic/proof mismatches;
- measure precision, recall, specificity, false-positive rate, evidence tier, cost, and regression state.

## Forbidden actions

- modify production detector code;
- modify target maps;
- rewrite expectations to fit output;
- reveal acceptance expectations to detector-development work before output is frozen;
- turn benchmark results into production Bug Report findings.

## Workflow

Artifact identity → frozen expectation → current detector → freeze observed output → compare → result class → quality metrics → bounded development handoff if needed.

For blind acceptance, observed output must be frozen before expected results are revealed.

## Contracts

Expectation schema: `../../schemas/benchmark-expectation.schema.json`

Result schema: `../../schemas/benchmark-result.schema.json`

Check corpus integrity:

```text
node scripts/validate-corpus.mjs
```

Check corpus readiness:

```text
node scripts/corpus-status.mjs
```

Filter regression candidates by objective priority basis:

```text
node scripts/regression-priority.mjs [basis]
```

Validate a frozen expectation:

```text
node scripts/validate-expectation.mjs expectation.json
```

Score:

```text
node scripts/score-benchmark.mjs result.json
```

Result classes: pass, false-negative, false-positive, semantic-mismatch, evidence-insufficient, runtime-proof-required, fixture-invalid.

## Handoff

Reusable mismatch → bounded handoff to m-bedrock-detection-development. Never auto-resume Map Bug Audit.

A benchmark failure is evidence for investigation, not permission to broaden the detector blindly.

## Map Audit quality mapping

For selected-map audit evaluation, also apply:

`docs/validation/retest-and-regression.md`

This preserves the distinction between detector correctness and proof maturity: NEED_VALIDATION is acceptable only when the frozen expectation explicitly permits unresolved proof at the configured evidence ceiling.

## Reference routing

- references/benchmark-expectation.md
- references/corpus-rules.md
- ../../references/detector-quality-metrics.md
- ../../references/evidence-cost-ladder.md

## STOP

Stop once the frozen expectation has a result class, quality metrics, and bounded handoff/residue.