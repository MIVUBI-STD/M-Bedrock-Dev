# Telemetry SDK

Canonical runtime-side telemetry emission helpers.

This package remains independent from `@minecraft/server`. A Bedrock integration supplies runtime scope/tick data and a transport sink; telemetry owns deterministic event construction, bounded buffering, probes, observation helpers, and transport framing.

## Internal hierarchy

```text
src/
├── core/         emitters, framing, sinks, transport, buffering, profile, scheduling
├── probes/       active/runtime probes, probe execution/session/responders
├── observation/  reusable monitors, observers and reporters
├── bedrock/      Bedrock bridge/lifecycle/kit integration surfaces
├── domains/
│   ├── arena/
│   ├── entity/
│   ├── mutation/
│   └── revive/
└── index.ts      sole cross-owner public entrypoint
```

Tests mirror the same hierarchy under `test/`.

These groups organize one telemetry package; they are not gameplay semantic owners.

## Ownership

Telemetry owns runtime-independent instrumentation behavior:

- typed event emitters;
- scope leases/providers;
- id/sequence generation;
- bounded buffering and drop accounting;
- callback/fanout/json-line sinks;
- probes, monitors, reporters, and instrumentation guards;
- transport framing and deterministic batching.

It does not own:

- canonical telemetry/evidence data contracts or schema authority;
- Minecraft Script API semantics;
- gameplay state machines;
- diagnosis/causal reasoning;
- repair decisions.

## Boundary

- Do not mutate gameplay state.
- Guards/probes/monitors are observation helpers only.
- Bounded buffers must report dropped evidence.
- Runtime-specific transport is injected through package contracts.
- Bedrock-facing helpers depend only on injected interface shapes and must not turn the package into a Minecraft semantic owner.
- Cross-owner consumers import through `src/index.ts`.

## Operational guidance

Use the composed telemetry kit for ordinary instrumentation. Use lower-level core/probe/observation primitives only when the map needs custom composition.

Profiles remain:

```text
full
qa
critical
off
```

Static/package telemetry wiring is never live-game proof by itself.
