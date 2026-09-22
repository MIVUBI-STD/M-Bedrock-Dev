# Map-specific Retest Planning

M-Bedrock-Dev can now turn an inspected map and an update delta into a bounded QA plan.

## Artifact flow

```text
.mcworld
→ inspectArtifact
→ automatic compatibility fingerprint
→ update delta
→ regression catalog
→ blindspot coverage
→ RetestPlan
```

The artifact API returns:

- artifact SHA/fingerprint;
- reliability fingerprint identity;
- inspection health counts;
- retest priority;
- concrete reasons;
- affected domains;
- suggested evidence lanes.

## Directory flow

A directory variant exists for development worktrees or extracted fixtures. It does not invent an artifact fingerprint.

## Planner output

Example:

```text
priority: P0
affectedDomains:
- structures
- multiplayer

reasons:
- update-overlap: structure runtime behavior changed
- historical-regression: structure gate failed after update
- coverage-gap: multiplayer/runtime unknown
- runtime-sensitive: multiplayer-concurrency

suggestedLanes:
- static
- differential
- runtime
- generative
```

This is a test-selection plan, not a runtime pass/fail result.

## Catalog validation

Update-delta and regression catalogs have basic structural validation so duplicate IDs or incomplete durable entries are rejected before they influence retest decisions.
