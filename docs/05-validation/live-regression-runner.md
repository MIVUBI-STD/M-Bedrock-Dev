# Live Regression Runner

The live runner aligns captured Minecraft snapshots with a deterministic timed scenario and stops conceptually at the first divergence.

## Explicit tick anchor

The runner requires `runtimeStartTick`.

```text
scenario tick 0 = runtimeStartTick
scenario tick N = observedTick - runtimeStartTick
```

It does not infer scenario start time from log content.

Snapshots without a runtime tick are preserved as skipped evidence rather than guessed into the timeline.

## Checkpoints

For each observed tick at or after the anchor:

1. replay all scenario actions through that scenario tick;
2. build the expected session model;
3. compare the runtime snapshot with the expected model;
4. retain the comparison as a checkpoint.

## Incident bundle

The first divergence produces a compact bundle:

```text
LiveRegressionIncidentBundle
├── scenario id/title
├── runtime/scenario tick
├── Minecraft version
├── artifact fingerprint
├── expected model
├── observed snapshot
├── divergence/invariant result
└── nearby snapshots
```

Nearby snapshots keep one observation before and after the divergent record when available.

## Initial regression scenario

`multiArenaCutsceneQueueScenario(offsetTicks)` supports 0, 1 and 2 tick offsets between arena starts.

The expected model permits both arenas to remain in independent starting/cutscene state. If runtime serializes them through one global cutscene lock, the second arena diverges from the model.

## Boundary

The runner evaluates previously captured evidence. It does not click Minecraft UI, create players, or schedule gameplay actions inside the game.

Live action-driving remains a separate future runtime-control layer.
