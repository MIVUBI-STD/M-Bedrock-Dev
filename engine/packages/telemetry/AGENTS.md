# Telemetry Package Agent Rules

Applies to `packages/telemetry/`.

## Ownership

This package owns runtime-independent telemetry emission and observation mechanics.

Use the internal hierarchy before broad search:

```text
core/         event construction, framing, buffering, sinks, transport, profile
probes/       active/runtime probe execution and sessions
observation/  monitors, observers, reporters
bedrock/      Bedrock bridge/lifecycle/kit integration
domains/      bounded arena/entity/mutation/revive instrumentation helpers
```

These folders are internal navigation groups, not public subpackages.

## Boundary

- Do not import from `apps/`, analyzer internals, or orchestrator internals.
- Keep emitters deterministic and bounded.
- Do not mutate gameplay state.
- Guards/probes/monitors never become gameplay authority.
- Bounded buffers must report dropped evidence.
- Runtime-facing adapters must not silently promote static/package evidence to runtime proof.
- Cross-owner consumers use `src/index.ts`.
