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


## Development kit

For most map-development instrumentation, prefer the composed kit:

```ts
const kit = createTelemetryInstrumentationKit({
  producer: "instrumentation",
  sessionId: qaSessionId,
  artifactId: buildArtifactId,
  maxEvents: 512,
  initialScope: {
    arenaId,
    arenaGeneration,
  },
  tickProvider: () => system.currentTick,
  transportSink,
});

kit.arenaStart.observeStart({
  arenaId,
  arenaGeneration,
  operationId: startOperationId,
});

const callbackGuard = kit.captureGeneration({
  subsystem: "countdown",
  callbackKind: "runTimeout",
  capturedGeneration: arenaGeneration,
});

const movement = kit.entityProgress({
  stallTicks: 40,
  minProgressDistance: 0.25,
});
```

Lifecycle controls are intentionally separate:

- `resetRuntimeState()` clears leases/guards/probe state but retains captured evidence;
- `clearBuffer()` clears captured evidence but leaves instrumentation state;
- `clearAll()` clears both.

This avoids accidentally deleting the diagnostic evidence during the same arena reset being investigated.


The development kit is the sole composed façade for telemetry instrumentation. Lower-level emitter/sink/guard/probe primitives remain available when a map needs custom composition, but there is no parallel session manager with separate lifecycle semantics.


## Verification reporter

The instrumentation kit exposes:

```text
kit.verify.route(...)
kit.verify.mutation(...)
```

These are thin canonical reporters over the same telemetry emitter.

```ts
kit.verify.route({
  routeId: "bridge-route",
  result: "passed",
  scope: { operationId: routeOperationId },
});

kit.verify.mutation({
  result: "failed",
  mechanism: "sentinel-block",
  scope: { operationId: mutationOperationId },
});
```

They do not perform the verification themselves. The caller supplies the observed result.

## Batch draining

```text
kit.batch()      → snapshot, retain buffered events
kit.drainBatch() → snapshot, then clear events + dropped count
```

Use `drainBatch()` when exporting a batch to transport so the same event set is not sent twice.


## Framed transport

For transports with payload-size limits:

```ts
const batch = kit.drainBatch();

const frames = frameTelemetryBatch(batch, {
  batchId: qaBatchId,
  maxPayloadCharacters: 1024,
});

for (const frame of frames) {
  sendFrame(JSON.stringify(frame));
}
```

Each frame carries:

```text
batchId
partIndex
partCount
checksum
payload
```

`reassembleTelemetryFrames()` accepts out-of-order frames and rejects:

- missing parts;
- duplicate part indexes;
- mixed batch ids;
- inconsistent part counts;
- checksum metadata mismatch;
- payload tampering;
- invalid reconstructed telemetry batches.

Framing limits JavaScript string characters, not encoded transport bytes. Byte-limited transports should choose a conservative frame size or add a transport-specific byte envelope outside this package.


## Temporal ordering

SDK helper events receive a monotonic local `sequence` automatically.

```text
tick
sequence
timestamp
```

have different roles:

- `tick` identifies engine tick when the integration can provide it;
- `sequence` orders helper-emitted events from one emitter, including multiple events in the same tick;
- `timestamp` is optional wall-clock metadata.

Sequence is owned by the emitter helper API and cannot be overridden through typed helper inputs. Low-level `emit(event)` remains available for already-constructed canonical events.

### Mutation apply observation

Use `mutationApplied` when the mutation has actually been applied/requested at the runtime instrumentation point:

```ts
kit.emitter.mutationApplied({
  mutationKind: "fill",
  routeId: "bridge-route",
  scope: {
    arenaId,
    arenaGeneration,
    operationId: mutationOperationId,
  },
});
```

This produces runtime evidence such as:

```text
world-mutation-observed
mutation-apply
route-affecting-world-mutation   // only when routeId is supplied
```

When an `entity-stall` or other downstream event shares the same scope, causal reasoning compares tick/sequence ordering.

```text
mutation tick 100 sequence 1
stall    tick 120 sequence 2
→ after-subject

stall    tick 80
mutation tick 100
→ before-subject
→ stall is observed, but not counted as causal support
```

If one side lacks comparable temporal metadata, status remains `unresolved`; it is not fabricated.


## Bedrock bridge

The SDK does not import `@minecraft/server`. Inject the Bedrock objects at the
map boundary:

```ts
import { system } from "@minecraft/server";

const buffer = createBufferedTelemetrySink();
const collector = createBedrockScriptEventTelemetryCollector({
  signal: system.afterEvents.scriptEventReceive,
  sink: buffer,
});

const telemetry = createTelemetryEmitter({
  producer: "instrumentation",
  sink: createBedrockScriptEventTelemetrySink(system),
  tickProvider: createBedrockTickProvider(system),
});
```

Bedrock exposes `system.currentTick`, `system.sendScriptEvent()`, and
`system.afterEvents.scriptEventReceive`; the bridge only depends on the small
shape required by those APIs.

Recommended multi-module flow:

```text
gameplay subsystem
  → TelemetryEmitter
  → mivubi:telemetry ScriptEvent
  → central ScriptEvent collector
  → validating / buffered / console sink
  → JSONL capture
  → analyzer --telemetry
```

The default script-event sink rejects payloads above 2048 characters. Keep
individual events compact; do not put large snapshots into one event.

If the ScriptEvent channel is reachable from command/NPC/player-driven sources,
use the collector `accept` callback as a trust-boundary filter.

## Runtime monitors

`createEntityProgressMonitor()` reports a stall only after an entity fails to
make the configured minimum progress for the configured tick window. Callers
must mark samples `eligible: false` while an entity is intentionally idle,
airborne, in cutscene/setup, or otherwise outside the movement contract.

`createStateMirrorMonitor()` emits state-drift telemetry on value divergence
or stale mirror revision and suppresses identical repeated drift reports until
the state becomes healthy or the drift changes.

## Instrumentation guards

`createArenaStartGuard()` observes accepted start operation ids and emits one
double-start anomaly per arena generation.

`captureDeferredGeneration()` captures an expected generation and emits one
stale-callback anomaly if a later callback observes a different generation.
The guard is observational; gameplay must still cancel/return when `check()`
returns false.


## Revive transaction monitoring

`createReviveTransactionMonitor()` is an observer-side helper for the revive
state machine. It does not grant, cancel, or complete revive gameplay.

Typical integration:

```ts
const reviveMonitor = createReviveTransactionMonitor(telemetry);

reviveMonitor.observeGeneration({
  targetPlayerKey,
  currentLifeGeneration: lifeGeneration,
});

reviveMonitor.observeStart({
  targetPlayerKey,
  targetLifeGeneration: lifeGeneration,
  reviverPlayerKey,
  eligible: isValidReviver,
  scope,
});

reviveMonitor.observeDeath({
  targetPlayerKey,
  targetLifeGeneration: lifeGeneration,
});

reviveMonitor.observeCompletion({
  targetPlayerKey,
  targetLifeGeneration: lifeGeneration,
  reviverPlayerKey,
  scope,
});
```

The monitor can emit:

- `self-revive`
- `multiple-revivers`
- `stale-revive`
- `revive-after-death`
- `invalid-reviver`

These are telemetry observations only. Gameplay authority remains in the map's
actual revive transaction/state machine.


## Performance safety

Instrumentation must not become a new hot path.

Use `createTickBudgetedTelemetrySink()` to cap event volume per tick and
maintain emitted/dropped counters. Unticked events have a separate bounded
budget.

Use `createSamplingTelemetrySink()` only for high-frequency observational
signals. Do not sample invariant violations such as double-start, stale
callback, revive anomaly, or failed verification.

Recommended composition:

```text
critical anomaly emitter
→ validating sink
→ bounded buffer / console

high-frequency progress telemetry
→ sampling sink
→ tick budget
→ validating sink
→ transport
```

The stall/state/revive guards already suppress identical repeated anomalies.


## Runtime profiles

Instrumentation can be gated with one shared runtime profile:

```text
full
qa
critical
off
```

### full

Preserves the historical/default SDK behavior.

- all telemetry event kinds pass;
- continuous state/entity monitors are enabled;
- active runtime probes are enabled when a probe transport is supplied.

Use for deep development investigation.

### qa

- all telemetry event kinds pass;
- continuous monitors are enabled;
- active runtime probes are disabled.

Use for routine QA runs when active probing is unnecessary.

### critical

Only high-value anomaly evidence passes:

- arena double start;
- arena generation anomaly;
- stale callback;
- revive anomaly;
- state drift;
- failed route revalidation;
- failed mutation verification.

Continuous entity/state probes and active runtime probes are disabled.

Recommended for low-overhead production diagnostics when telemetry is intentionally retained.

### off

- all emitted telemetry is discarded before buffering/transport;
- continuous monitors return `disabled`;
- active probes are unavailable;
- Bedrock lifecycle host does not register periodic flush or ScriptEvent collection.

Use when instrumentation must remain wired into source but produce no runtime telemetry.

### Configuration

```ts
const kit = createTelemetryInstrumentationKit({
  profile: "critical",
  // ...
});
```

or:

```ts
const host = createBedrockTelemetryLifecycleHost({
  system,
  transport,
  profile: "off",
});
```

The default is `full` for backward compatibility. Production builds should choose `critical` or `off` explicitly rather than relying on the default.
