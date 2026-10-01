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

Use when a frozen fixture/corpus expectation exists or a Detection Capability Delta needs evaluation.

## Allowed actions

- execute current detection capability;
- compare expected vs observed;
- classify FP/FN/semantic/proof mismatches;
- measure precision/recall, evidence tier, cost, and regression state.

## Forbidden actions

- modify production detector code;
- modify target maps;
- rewrite expectations to fit output;
- turn benchmark results into production Bug Report findings.

## Workflow

Frozen expectation → current detector → compare → result class → quality metrics → bounded development handoff if needed.

## Output contract

Validate/score against ../../schemas/benchmark-result.schema.json.

Run: node scripts/score-benchmark.mjs result.json

Result classes: pass, false-negative, false-positive, semantic-mismatch, evidence-insufficient, runtime-proof-required, fixture-invalid.

## Handoff

Reusable mismatch → bounded handoff to m-bedrock-detection-development. Never auto-resume Map Bug Audit.

## Reference routing

- references/benchmark-expectation.md
- references/corpus-rules.md
- ../../references/detector-quality-metrics.md
- ../../references/evidence-cost-ladder.md

## STOP

Stop once the frozen expectation has a result class, quality metrics, and bounded handoff/residue.
