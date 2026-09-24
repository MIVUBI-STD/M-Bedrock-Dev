# Telemetry Package Agent Rules

Applies to `packages/telemetry/`.

## Ownership

This package owns runtime-independent telemetry emission behavior:

- typed event emitters;
- scope leases/providers;
- id generation;
- bounded buffering and drop accounting;
- callback/fanout/json-line sinks;
- instrumentation guards.

It does **not** own:

- telemetry data contracts or schema validation authority
  (owned by `packages/project-model`);
- Minecraft Script API semantics
  (owned by analyzers/compatibility);
- evidence adaptation, diagnostics, or causal reasoning
  (owned by `packages/orchestrator` + diagnostics/knowledge).

## Boundary

- Do not import `@minecraft/server`.
- Do not import from `apps/`, `analyzers/`, or `packages/orchestrator`.
- Keep emitters synchronous and deterministic.
- Runtime-specific transport is injected through `TelemetrySink`.
- Do not mutate gameplay state.
- Guards are observation helpers only; they never become gameplay authority.
- Bounded buffers must report dropped evidence; never silently discard without accounting.
