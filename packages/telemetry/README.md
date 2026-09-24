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


## Runtime probes

### Entity progress / stall

```ts
const progress = createEntityProgressProbe(telemetry, {
  stallTicks: 40,
  minProgressDistance: 0.25,
});

progress.observe({
  entityKey: entity.id,
  routeId: "bridge-route",
  tick: system.currentTick,
  position: entity.location,
  expectedToProgress: hasActiveTarget,
  scope: {
    arenaId,
    arenaGeneration,
    operationId: routeOperationId,
  },
});
```

The probe:

- only counts time while `expectedToProgress` is true;
- emits one stall event per no-progress episode;
- rearms after meaningful movement;
- resets safely if tick order moves backwards;
- requires explicit route/runtime scope from the caller.

It does not decide whether the entity *should* have a target. That remains gameplay/AI authority outside telemetry.

### State mirror drift

```ts
const mirrors = createStateMirrorProbe(telemetry);

mirrors.observe({
  contractId: "ready-state",
  authority: {
    surface: { kind: "scoreboard", key: "ready" },
    value: readyScore,
    revision: authorityRevision,
  },
  mirror: {
    surface: { kind: "tag", key: "ready" },
    value: readyTag,
    revision: mirrorRevision,
  },
  scope: { arenaId, arenaGeneration },
});
```

Repeated identical drift is deduplicated. A changed drift state emits a new observation, and a consistent observation rearms the probe.


### Revive transaction observation

```ts
const reviveGuard = createReviveTelemetryGuard(telemetry);

reviveGuard.observeAttempt({
  targetPlayerKey,
  reviverPlayerKey,
  scope: {
    arenaId,
    arenaGeneration,
    lifeGeneration,
  },
});

reviveGuard.observeCompletion({
  targetPlayerKey,
  reviverPlayerKey,
  scope: {
    arenaId,
    arenaGeneration,
    lifeGeneration,
  },
  transactionCurrent,
  targetDeadConfirmed,
  reviverEligible,
});
```

The guard can observe:

- self revive;
- multiple distinct revivers;
- stale completion;
- completion after confirmed death;
- invalid reviver.

It does not decide revive eligibility. The caller supplies authoritative runtime facts such as `transactionCurrent`, `targetDeadConfirmed`, and `reviverEligible`.


## Session façade

For normal map instrumentation, prefer the composed session:

```ts
const session = createTelemetrySession({
  producer: "instrumentation",
  sessionId: qaSessionId,
  artifactId: buildArtifactId,
  maxEvents: 512,
  tickProvider: () => system.currentTick,
  initialScope: {
    arenaId,
    arenaGeneration,
  },
  transportSink,
});

session.telemetry.routeRevalidation({
  routeId: "bridge-route",
  result: "passed",
  scope: { operationId: routeOperationId },
});

session.arenaStart.observeStart({
  arenaId,
  arenaGeneration,
  operationId: startOperationId,
});

const progress = session.createEntityProgressProbe({
  stallTicks: 40,
});

const batch = session.batch();
```

The session composes the same canonical primitives:

- validating emitter;
- shared scope lease;
- bounded buffer;
- optional fanout transport;
- arena-start guard;
- revive guard;
- state-mirror probe;
- deferred-generation guard factory;
- entity-progress probe factory.

`reset()` clears observer state and buffered evidence without resetting the emitter id counter, preserving event-id monotonicity for the session instance.
