# Campaign History and Domain-specific Minimization

Reliability Search now preserves longitudinal campaign evidence and minimizes failures with domain-aware reducers.

## Append-only campaign history

A campaign record can store:

- campaign id and timestamp;
- map id;
- Minecraft version;
- artifact fingerprint;
- reliability fingerprint id;
- mutation report;
- generated blindspot tasks;
- optional notes.

Record identity is content-derived.

Duplicate evidence is rejected.

History is append-only by policy: new campaigns add new records instead of rewriting old evidence.

Repository storage is reserved under:

```text
reliability/history/
```

## Source minimization

`minimizeSourceLines()` performs delta debugging over source lines.

Use it for:

- mcfunction failure fixtures;
- Script API source mutation reproductions;
- small generated source snippets.

It preserves only the supplied failure predicate.

## Timed scenario minimization

`minimizeTimedScenario()`:

1. removes irrelevant actions using ddmin;
2. attempts to collapse unnecessary action ticks toward zero;
3. shifts the remaining schedule to the earliest possible origin when the failure still reproduces.

The goal is a short replayable timing trace, not merely fewer actions.

## Graph fixture minimization

`minimizeGraphFixture()` removes unrelated nodes/files from a reproducible graph failure.

Use it for:

- function dependency failures;
- script import failures;
- future entity/controller reference graphs.

## Boundary

Minimization never decides what the failure means.

The caller supplies a deterministic `stillFails` predicate owned by the real detector/runtime comparison layer.
