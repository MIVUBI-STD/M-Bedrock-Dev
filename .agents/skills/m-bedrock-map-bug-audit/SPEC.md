# Map Bug Audit Specification

## Intent

Find gameplay contradictions using only one selected map version.

## Source isolation

```text
explicit selected .mcworld
or
single current root .mcworld
→ sole current gameplay evidence universe
```

Older versions, raw/development source, previous QA, Technical Docs, changelogs, other maps, and external documents are archive/reference only.

## Required entry state

```text
target artifact pinned
+ map version pinned
+ Gameplay Contract derived from that artifact
+ readiness = READY | scoped-safe PARTIAL
```

`BLOCKED` prevents defect classification for that scope.

## Evidence model

```text
selected artifact authored gameplay signals
→ Expected Behavior

selected artifact executable/runtime evidence
→ Actual Behavior

Expected ≠ Actual
→ candidate
```

## Acceptance

- one artifact/version only;
- every candidate has one disposition;
- only defects receive severity;
- counter-evidence and player impact are settled;
- proof ceiling is explicit;
- no engine or target mutation occurs.

## Limit

Missing intent stays unknown. Never fill it from another version or stale documentation.