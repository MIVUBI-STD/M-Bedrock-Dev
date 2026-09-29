# Bedrock Reliability Harness

Thin Script API behavior-pack example for emitting runtime reliability evidence.

## Purpose

The harness does only three things:

1. capture configured tags/scores/entities;
2. serialize the observation snapshot;
3. emit the snapshot to the Minecraft content log.

It does not decide whether runtime behavior is correct.

Correctness stays in `packages/reliability`.

## Transport

The default transport uses `console.warn()` because Microsoft documents it as the most reliable content-log output path for scripts. The harness emits one compact JSON record per capture prefixed with:

```text
[M-BEDROCK-OBS]
```

## Scheduling and probe cost

The harness is targeted-first.

By default:

- continuous full snapshots are disabled;
- the fallback snapshot interval is 20 ticks when continuous capture is explicitly enabled;
- player and arena summaries are included;
- dimension-wide entity enumeration is disabled;
- targeted `m-bedrock:probe` requests remain available for the exact state needed by a diagnosis.

Send the `m-bedrock:capture` script event when a one-shot observation snapshot is required.

This prevents the reliability harness from enumerating every entity and serializing a full world snapshot every script tick merely to wait for a possible failure. Enable continuous/entity capture only for experiments that explicitly require that evidence.

## Integration

Copy this directory as the basis of a development-only behavior pack, then adjust:

- manifest UUIDs;
- `@minecraft/server` dependency version;
- scoreboard objective names;
- arena fake-player participants;
- entity queries;
- arena/session tag naming.

Do not ship this harness in production maps unless explicitly desired.
