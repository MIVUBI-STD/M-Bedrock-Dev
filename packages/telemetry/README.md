# Telemetry SDK

Canonical runtime-side telemetry emission helpers.

This package is deliberately independent from `@minecraft/server`. A Bedrock
map supplies runtime scope/tick data and a transport sink; the SDK owns
canonical event construction, ids, buffering, and batching.

## Example

```ts
const buffer = createBufferedTelemetrySink();
const scope = createTelemetryScopeLease({
  arenaId: "arena-1",
  arenaGeneration: 4,
});

const telemetry = createTelemetryEmitter({
  producer: "instrumentation",
  sink: buffer,
  scopeProvider: () => scope.current(),
});

telemetry.entityStall({
  entityKey: "demo:zombie",
  routeId: "bridge-route",
  stalledTicks: 80,
});

const batch = buffer.batch({
  sessionId: "qa-run-1",
  artifactId: "art_expected",
});
```

Use a callback or fanout sink to bridge events to ScriptEvent, console logging,
dynamic-property transport, or another project-owned channel.
