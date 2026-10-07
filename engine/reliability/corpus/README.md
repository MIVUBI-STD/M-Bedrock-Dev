# Reliability Corpus

This directory owns frozen evaluation manifests for real-map and reduced regression evidence.

```text
calibration.json             detector-development corpus; may inform implementation
acceptance.json              blind/holdout corpus; must not inform detector changes before scoring
regressions.json             minimized bug-specific regression cases
audit-detection-cases.json   frozen historical detection/recall pressure; never current-artifact proof
gameplay-understanding.md    human-readable calibration corpus context and semantic baselines
```

## Rules

- Map binaries remain outside Git unless they are explicitly safe, minimized fixtures.
- Every external artifact must be identified by stable metadata and SHA-256 before a result is accepted.
- Expectations are frozen before a benchmark run.
- Acceptance expectations must not be rewritten to match detector output.
- Material detectors need both positive and negative cases.
- Runtime-only behavior is not converted into a static defect when runtime proof is missing.
- A corpus change requires provenance independent of the implementation under test.

## Execution boundary

Corpus cases do not define an alternate detector.

- Real-map cases are replayed through the canonical selected-map audit entrypoint.
- Reduced fixtures are replayed through their owning production analyzer/capability.
- Historical reports/catalogs are comparison or search-pressure inputs only; they are never fed into the production audit as defect evidence.
- Metrics from reduced fixtures and real-map production replay must remain distinguishable; do not claim end-to-end map recall from analyzer-only fixtures.

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


## Readiness states

```text
candidate  known source exists, but scoring prerequisites are incomplete
ready      artifact identity + frozen expectation are complete
blocked    source/evidence is invalid or cannot currently be evaluated
```

A candidate must never be counted as benchmark proof.

Check current readiness manually:

```text
node .agents/skills/m-bedrock-detection-benchmark/scripts/corpus-status.mjs
```


Before changing a case to `ready`, run:

```text
node .agents/skills/m-bedrock-detection-benchmark/scripts/check-case-ready.mjs <manifest.json> <case-id>
```

Promotion is fail-closed: unresolved source references or any declared missing prerequisite keep the case out of benchmark-ready state.


## Evidence role

Where the source evidence already supports classification, a case may declare:

```text
positive  known defect/failure evidence
negative  known-good/non-defect evidence
```

Do not infer an evidence role merely from the map name or from the absence of a recorded issue outside a defined QA scope.

Existing semantic-understanding calibration cases remain role-unspecified until an independent expectation is grounded.


## Regression priority basis

Regression cases may carry objective `priorityBasis` tags such as:

```text
repeated-across-maps
runtime-sensitive
semantic-owner-present
intermittent-reproduction
explicit-invariant
```

These are routing reasons, not a quality score or winner ranking.

Filter current candidates manually:

```text
node .agents/skills/m-bedrock-detection-benchmark/scripts/regression-priority.mjs
node .agents/skills/m-bedrock-detection-benchmark/scripts/regression-priority.mjs runtime-sensitive
node .agents/skills/m-bedrock-detection-benchmark/scripts/regression-priority.mjs repeated-across-maps
```

## Corpus roles

Not every corpus file has the same shape.

```text
calibration / acceptance / regressions
→ machine benchmark manifests

audit-detection-cases
→ reusable frozen defect-family recall expectations

gameplay-understanding
→ human-readable calibration context and reviewed semantic baselines
```

All corpus content is evaluation/reference material. None of it is current map truth.

Historical chronological results belong in `engine/reliability/history/`, not here.
