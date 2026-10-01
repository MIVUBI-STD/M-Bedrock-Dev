# Reliability Corpus

This directory owns frozen evaluation manifests for real-map and reduced regression evidence.

```text
calibration.json   detector-development corpus; may inform implementation
acceptance.json    blind/holdout corpus; must not inform detector changes before scoring
regressions.json   minimized bug-specific regression cases
```

## Rules

- Map binaries remain outside Git unless they are explicitly safe, minimized fixtures.
- Every external artifact must be identified by stable metadata and SHA-256 before a result is accepted.
- Expectations are frozen before a benchmark run.
- Acceptance expectations must not be rewritten to match detector output.
- Material detectors need both positive and negative cases.
- Runtime-only behavior is not converted into a static defect when runtime proof is missing.
- A corpus change requires provenance independent of the implementation under test.

## Case lifecycle

```text
candidate
→ expectation-approved
→ artifact-verified
→ runnable
→ scored
→ retained as calibration / acceptance / regression evidence
```

A candidate without approved expectations or artifact identity is not benchmark evidence.
