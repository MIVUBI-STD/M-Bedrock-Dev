# Current Validation

Snapshot date: 2026-10-01  
Branch: `Local`

This file is the current proof snapshot. It is not a chronological validation log.

## Current repository state

The branch now contains:

- the established static/source reasoning stack;
- explicit proof ceilings and runtime-required boundaries;
- separated calibration / blind acceptance / regression corpus lanes;
- frozen expectation contract with artifact SHA-256 identity;
- TP/TN/FP/FN benchmark scoring with precision, recall, specificity, and false-positive rate;
- no-op real-artifact package roundtrip proof;
- canonical reliability routing under `engine/reliability/`.

## Reliability corpus readiness

Current tracked corpus candidates:

```text
calibration candidates   8
regression candidates    19
acceptance cases         0
benchmark-ready cases    0
stored map fingerprints  0
```

The 8 calibration candidates are indexed from:

```text
engine/fixtures/calibration/gameplay-understanding-samples.json
```

The regression candidates are indexed from grounded historical/manual QA evidence in:

```text
engine/reliability/catalogs/regressions.json
```

These are **candidates**, not benchmark proof. The stored map-fingerprint catalog currently contains no map entries, so no candidate may be promoted from cached identity. They remain unscored until required artifact identity and frozen expectations exist.

## Package proof state

The package validation model now has three explicit levels:

```text
Level A  synthetic deterministic transport proof
Level B  real-artifact no-op roundtrip proof
Level C  Minecraft runtime acceptance
```

`package-roundtrip` compares extracted path, file size, and SHA-256 content before and after deterministic packaging.

This proves transport preservation only. It does not prove Minecraft loadability or gameplay correctness.

## Current proof limits

Still requiring stronger evidence:

- real artifact fingerprints for current corpus candidates;
- frozen positive and negative benchmark expectations;
- blind acceptance/holdout cases;
- measured detector TP/TN/FP/FN on real evidence;
- minimized regression fixtures for historical bugs;
- Minecraft runtime proof for chunk residency, entity AI, persistence/reconnect, and other runtime-only behavior;
- end-to-end validation at the exact current head.

## Integrated verification bookkeeping

The last retained integrated verification point predates the current reliability/corpus consolidation:

```text
validated source revision  5e02256869b4fc2107a1cbcf0ff85f0aac6745ac
GitHub Actions Verify       36431630205
repository policy           pass
source hygiene              pass
public API audit            pass
typecheck                   pass
full test suite             pass
```

Current work intentionally does not run CI. Therefore the changes above are implementation/state updates, not upgraded CI proof.

Historical validation remains recoverable from Git history. Longitudinal execution evidence belongs under `engine/reliability/history/`.


## Corpus integrity guardrails

The benchmark lane now provides manual non-CI checks for:

```text
validate-corpus.mjs      duplicate IDs, broken sourceRef, cross-lane contamination, false-ready state
corpus-status.mjs        current candidate/ready/blocked readiness
check-case-ready.mjs     fail-closed candidate promotion
validate-expectation.mjs frozen expectation identity/provenance
score-benchmark.mjs      TP/TN/FP/FN quality metrics
```

These checks improve evidence discipline but are not runtime proof.
