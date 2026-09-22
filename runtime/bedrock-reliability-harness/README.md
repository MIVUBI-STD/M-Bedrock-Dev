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

## Scheduling

The sample uses `system.runInterval` with a configurable interval. Minecraft's Script API schedules these callbacks on script ticks.

## Integration

Copy this directory as the basis of a development-only behavior pack, then adjust:

- manifest UUIDs;
- `@minecraft/server` dependency version;
- scoreboard objective names;
- arena fake-player participants;
- entity queries;
- arena/session tag naming.

Do not ship this harness in production maps unless explicitly desired.
