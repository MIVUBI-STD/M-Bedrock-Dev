# Current Validation

Snapshot date: 2026-10-01
Branch: `Local`

## Verified

Last retained integrated verification:

```text
revision       5e02256869b4fc2107a1cbcf0ff85f0aac6745ac
GitHub Verify  36431630205
policy         pass
source hygiene pass
public API     pass
typecheck      pass
full tests     pass
```

Package roundtrip proof exists for transport preservation only. It does not prove gameplay correctness.

## Current unverified changes

Current `Local` includes additional source changes that have **not** been CI/local/runtime verified:

- selected-map-version-only audit authority;
- Gameplay Contract derived only from selected-artifact evidence;
- external/reference sources isolated from normal audit;
- discovered-surface accounting for audit coverage;
- approval-gated Bug Report and repair workflow;
- Must Change + Must Preserve repair authority;
- proposal-only inspection repair planning.

## Known limits

- gameplay-surface discovery may still miss mechanics the analyzers do not recognize;
- discovered-surface accounting is not proof of whole-map completeness;
- runtime-only behavior still needs Minecraft runtime proof;
- real-map false-negative rate is not yet measured;
- benchmark/calibration work remains deferred.

## Rule

Do not claim current-head CI/runtime proof until it is actually run. Historical proof remains in Git/reliability history.