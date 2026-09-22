# End-to-end Regression Session Report

The session report merges runtime-control evidence and runtime-observation evidence into one result.

## Inputs

```text
LiveRegressionScenario
RuntimeControlPlan
Control ACK records
RuntimeObservationSnapshot[]
runtimeStartTick
```

## Control accounting

Each requested control action is classified as:

- executed;
- failed;
- missing-ack;
- late.

A late action is not silently treated as valid because timing is part of the regression condition.

## Verdicts

```text
pass
runtime-divergence
control-failure
incomplete-evidence
```

### pass

All required controls executed on time and runtime observations match the expected model.

### runtime-divergence

Control execution is trustworthy, but observed Minecraft state diverges from the deterministic expected model.

### control-failure

A requested action failed or executed after the requested tick.

### incomplete-evidence

Required acknowledgements or usable runtime checkpoints are missing.

## Why this separation matters

Without control evidence, an apparent gameplay divergence could actually be caused by the test harness failing to issue the intended action.

The session report prevents those two failure classes from being conflated.

## First live target

The first intended local validation remains:

```text
reg_multi_arena_cutscene_queue_offset_0
reg_multi_arena_cutscene_queue_offset_1
reg_multi_arena_cutscene_queue_offset_2
```

This commit prepares the report layer only; it does not claim live Minecraft proof.
