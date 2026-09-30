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


## Client lifecycle proof boundary

Server-state simulation is not client lifecycle proof.

The development control actions named `disconnect` and `reconnect` only toggle harness/session tags on an already connected player. They are useful for deterministic state-machine testing, but they do **not** disconnect a Minecraft client from the server or prove network reconnect behavior.

Any orchestration built on these controls must declare `proofAuthority: "server-simulated"`. Only an adapter that controls independent real Minecraft client processes/connections may declare `proofAuthority: "live-runtime"`.


## Runtime Lab action protocol

The harness now supports the Runtime Lab capability/action transport:

- `m-bedrock:capabilities` announces only action capabilities implemented by this harness;
- `m-bedrock:action` executes one capability-validated action request and emits `[M-BEDROCK-ACTION]` evidence;
- existing `m-bedrock:probe`, `m-bedrock:capture`, and legacy `m-bedrock:control` remain supported.

The current built-in action provider covers multi-arena stress fixtures, repeated-cycle cleanup validation, and generation-scoped global-state lease races.

Server-simulated disconnect/session controls remain fixture evidence only. They do not establish real client/network lifecycle proof.


## Map-specific adapter

Runtime actions call `scripts/map-adapter.js` instead of hard-coding one
map's join/start/finish implementation into the harness protocol.

The bundled adapter uses the generic `arena:<id>` and `session:*` tag
fixture and declares `proofAuthority: "server-simulated"`.

For a production map validation harness:

1. copy `scripts/map-adapter.example.js`;
2. implement the authored map reset/start/finish/baseline hooks;
3. preserve arena/generation scoping;
4. use an external multi-client adapter for true disconnect/reconnect proof;
5. declare `live-runtime` authority only when the hook controls the real
   authored gameplay path rather than fixture tags.


## Session lifecycle action provider

`scripts/session-action.js` implements the server-side fixture actions used
by multiplayer session experiments:

- join-pad enter/leave;
- connection-generation simulation;
- life-generation simulation;
- pending transition invalidation;
- fixture cleanup.

Its evidence inherits the configured map adapter proof authority. With the
bundled generic adapter this is `server-simulated`, so requirements that
explicitly demand `live-runtime` authority will not qualify from these
fixture transitions.

Use an external multi-client controller for actual disconnect/reconnect
authority.


## Repeated-run baseline surface providers

Repeated-cycle validation is intentionally fail-closed. A requested
surface that the active map adapter does not implement makes the
baseline comparison incomplete rather than silently passing.

The bundled generic adapter implements:

- `arena-membership`
- `tags`

Map-specific adapters can add providers for surfaces such as:

- scoreboard objectives/participants;
- dynamic properties;
- active effects;
- input permissions;
- map-owned deferred timer handles;
- global lease ownership state.

A provider captures one generation-scoped snapshot and compares the
post-cycle state against that snapshot. Runtime Lab remains unaware of
map-specific storage details.
