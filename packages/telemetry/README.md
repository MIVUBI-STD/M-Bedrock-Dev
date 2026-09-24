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


## Bedrock integration pattern

The SDK intentionally does not import `@minecraft/server`.

Map code can inject Bedrock runtime values:

```ts
const buffer = createBufferedTelemetrySink(512);

const telemetry = createTelemetryEmitter({
  producer: "instrumentation",
  sink: createValidatingTelemetrySink(buffer),
  tickProvider: () => system.currentTick,
  scopeProvider: () => ({
    arenaId: runtime.arenaId,
    arenaGeneration: runtime.arenaGeneration,
  }),
});
```

A transport can be injected separately:

```ts
const transport = createJsonLineTelemetrySink((line) => {
  sendTelemetryLine(line);
});

const sink = createFanoutTelemetrySink([
  buffer,
  transport,
]);
```

The SDK does not define how `sendTelemetryLine` reaches QA tooling. That remains a deployment/runtime concern.

## Instrumentation guards

### Arena start

```ts
const startGuard = createArenaStartGuard(telemetry);

startGuard.observeStart({
  arenaId,
  arenaGeneration,
  operationId,
});
```

Repeated calls with the same operation id are idempotent. A second distinct operation in the same arena generation emits one `arena-double-start` event. Additional duplicates in that generation do not spam telemetry.

### Deferred generation

```ts
const generationGuard = captureDeferredGeneration(telemetry, {
  subsystem: "countdown",
  callbackKind: "runTimeout",
  capturedGeneration: arenaGeneration,
  scope: { operationId: countdownOperationId },
});

system.runTimeout(() => {
  if (!generationGuard.check(currentArenaGeneration(), {
    tick: system.currentTick,
  })) return;

  // current-generation work
}, delay);
```

The guard reports a stale callback once and returns `false`. It is an instrumentation helper, not a replacement for gameplay ownership checks.

## Bounded buffering

`createBufferedTelemetrySink(maxEvents)` keeps only the newest events.

It exposes:

```text
size
dropped
```

and `batch()` includes `droppedEvents` when truncation occurred.

The inspector converts a non-zero dropped count into:

```text
TELEMETRY_EVENTS_DROPPED
runtime-evidence-incomplete
```

so incomplete capture is never silent.
