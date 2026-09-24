# Runtime Telemetry Contract

## Purpose

Runtime telemetry is the canonical external evidence format for QA, instrumentation, dedicated-server traces, and manual reproduction sessions.

It is intentionally separate from static analyzers.

```text
runtime / QA capture
↓
TelemetryBatch
↓
schema validation
↓
TelemetryEvent[]
↓
telemetryRuntimeEvidence()
↓
RuntimeEvidenceRecord[]
↓
knowledge reasoning
↓
causal chains / incidents / root-cause candidates
```

## Batch format

```json
{
  "schemaVersion": 1,
  "sessionId": "qa-defense-v2-2026-09-24",
  "artifactId": "art_optional_expected_artifact_id",
  "events": []
}
```

`artifactId` is optional. When present during artifact inspection it must match the inspected artifact. Telemetry captured from another build is rejected.

Every event requires:

```json
{
  "schemaVersion": 1,
  "eventId": "unique-event-id",
  "kind": "entity-stall",
  "producer": "qa",
  "scope": {}
}
```

Producer values:

- `runtime`
- `qa`
- `manual`
- `instrumentation`
- `server`

## Scope

Use the narrowest known scope.

```json
{
  "arenaId": "arena-3",
  "arenaGeneration": 12,
  "playerKey": "player-a",
  "connectionGeneration": 4,
  "lifeGeneration": 2,
  "entityKey": "demo:zombie",
  "entityGeneration": 8,
  "operationId": "artifact:functions/bridge.mcfunction:18:0",
  "subsystemGeneration": 5
}
```

Causal corroboration only combines evidence in the same normalized runtime scope. Do not omit an operation/generation merely to make two observations correlate.

## Event kinds

### entity-stall

```json
{
  "schemaVersion": 1,
  "eventId": "stall-001",
  "kind": "entity-stall",
  "producer": "instrumentation",
  "scope": {
    "arenaId": "bridge",
    "arenaGeneration": 7,
    "operationId": "artifact:functions/bridge.mcfunction:18:0"
  },
  "entityKey": "demo:zombie",
  "routeId": "bridge-route",
  "stalledTicks": 80,
  "distanceDelta": 0.1
}
```

Produces observed predicates including:

```text
entity-stall-observed
navigation-stall-observed
```

### teleport-fallback

Used when AI/player recovery actually reaches teleport fallback.

Produces:

```text
teleport-fallback-observed
```

### arena-double-start

```json
{
  "schemaVersion": 1,
  "eventId": "double-start-001",
  "kind": "arena-double-start",
  "producer": "qa",
  "scope": {},
  "arenaId": "arena-2",
  "arenaGeneration": 9,
  "startOperationIds": ["countdown-a", "countdown-b"]
}
```

Produces an explicit invariant contradiction:

```text
arena-start-observed = PRESENT
single-start-transaction-owner = ABSENT
arena-double-start-observed = PRESENT
```

This can become a direct knowledge relation violation.

### stale-callback

Use only when the callback is known to belong to an old generation.

```json
{
  "schemaVersion": 1,
  "eventId": "stale-countdown-001",
  "kind": "stale-callback",
  "producer": "instrumentation",
  "scope": {
    "arenaId": "arena-2",
    "arenaGeneration": 10,
    "operationId": "countdown-callback"
  },
  "subsystem": "countdown",
  "callbackKind": "runTimeout",
  "capturedGeneration": 9,
  "currentGeneration": 10
}
```

If both generations are provided they must differ.

### revive-anomaly

Supported anomaly values:

```text
self-revive
multiple-revivers
stale-revive
revive-after-death
invalid-reviver
```

A `self-revive` event requires `reviverPlayerKey` to equal `targetPlayerKey`.

### state-drift

```json
{
  "schemaVersion": 1,
  "eventId": "ready-drift-001",
  "kind": "state-drift",
  "producer": "instrumentation",
  "scope": {
    "arenaId": "arena-1",
    "arenaGeneration": 4
  },
  "contractId": "ready-state",
  "authority": {
    "surface": { "kind": "scoreboard", "key": "ready" },
    "value": 1,
    "revision": 8
  },
  "mirror": {
    "surface": { "kind": "tag", "key": "ready" },
    "value": 0,
    "revision": 7
  }
}
```

Produces explicit inconsistent-mirror evidence and an observed state-drift outcome.

### route-revalidation

```json
{
  "schemaVersion": 1,
  "eventId": "route-check-001",
  "kind": "route-revalidation",
  "producer": "runtime",
  "scope": {
    "operationId": "artifact:functions/bridge.mcfunction:18:0"
  },
  "routeId": "bridge-route",
  "result": "passed"
}
```

A matching `passed` event can satisfy the route-revalidation requirement for that exact operation. A matching `failed` event can turn the same requirement into an explicit violation.

### mutation-verification

Use for runtime post-mutation sentinel/region verification.

```json
{
  "schemaVersion": 1,
  "eventId": "mutation-check-001",
  "kind": "mutation-verification",
  "producer": "runtime",
  "scope": {
    "operationId": "artifact:functions/load.mcfunction:12:0"
  },
  "result": "passed",
  "mechanism": "sentinel-block"
}
```

This produces post-placement readiness evidence. It does not, by itself, prove ordering relative to dependent actions unless the operation scope and transaction analyzer provide that proof.

## CLI

```text
npm run cli -- inspect map.mcworld \
  --edition bedrock \
  --version <minecraft-version> \
  --telemetry qa/runtime.json
```

Telemetry is intentionally accepted only by `inspect`. Applying one runtime capture to both sides of an artifact comparison would create invalid evidence.

## Evidence semantics

Telemetry events are observations, not unrestricted truth upgrades.

Rules:

1. event scope must match the static/runtime operation it is intended to corroborate;
2. unrelated entity observations do not strengthen a route unless the route contract explicitly links that entity;
3. observed downstream outcomes do not prove sole causation;
4. duplicate event ids are rejected;
5. artifact identity mismatch is rejected when the batch declares `artifactId`;
6. absence of a telemetry event is never interpreted as absence of the runtime behavior.

## Output

Inspection reports:

```text
telemetryAnalysis.events
telemetryAnalysis.evidenceRecords
telemetryAnalysis.byKind
```

Telemetry-derived evidence participates in:

- knowledge relation violations;
- evidence gaps;
- causal corroboration;
- observed downstream outcomes;
- causal incidents;
- ranked root-cause candidates.


## Runtime emitter SDK

Canonical runtime helpers live in:

```text
packages/telemetry/
```

while the event schema remains owned by:

```text
packages/project-model/
```

This keeps map instrumentation independent from analyzer/orchestrator code.

### Core helpers

```text
createTelemetryEmitter
createTelemetryScopeLease
createCounterTelemetryIdFactory
createBufferedTelemetrySink
createValidatingTelemetrySink
createFanoutTelemetrySink
createCallbackTelemetrySink
createJsonLineTelemetrySink
createArenaStartGuard
captureDeferredGeneration
```

Emitter options can provide current runtime context:

```ts
createTelemetryEmitter({
  producer: "instrumentation",
  sink,
  baseScope,
  scopeProvider,
  tickProvider,
  timestampProvider,
});
```

Event-level scope overrides provider scope only for the supplied fields.

### Buffer truncation

Bounded buffering tracks how many old events were discarded:

```json
{
  "schemaVersion": 1,
  "droppedEvents": 12,
  "events": []
}
```

During inspection this is surfaced as:

```text
TELEMETRY_EVENTS_DROPPED
```

and the reliability fingerprint adds:

```text
telemetry-truncated
runtime-evidence-incomplete
```

A capture with dropped events remains usable, but absence of an observation cannot be treated as strong negative evidence.

### Runtime package boundary

`packages/telemetry` does not import `@minecraft/server`.

Bedrock code supplies:

- `system.currentTick` through `tickProvider`;
- current arena/player/entity generations through `scopeProvider`;
- transport through a `TelemetrySink`.

This avoids tying the deterministic SDK to one Script API version or transport mechanism.


## Canonical instrumentation façade

The single composed runtime façade is:

```text
createTelemetryInstrumentationKit()
```

It combines:

- canonical emitter;
- validating sink by default;
- bounded in-memory buffer;
- optional fanout transport;
- runtime scope lease;
- arena-start guard;
- deferred-generation guard factory;
- revive anomaly guard;
- state-mirror probe;
- entity-progress/stall probe factory;
- route/mutation verification reporter.

Example:

```ts
const kit = createTelemetryInstrumentationKit({
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
```

Verification reports use:

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

Batch lifecycle:

```text
kit.batch()      → snapshot without clearing
kit.drainBatch() → snapshot and atomically clear buffer/drop count
```

Runtime state and captured evidence are intentionally separate:

```text
resetRuntimeState()
  clears scope/guard/probe state
  preserves evidence

clearBuffer()
  clears captured evidence/drop count
  preserves runtime observer state

clearAll()
  clears both
```

This separation prevents arena cleanup from deleting the evidence needed to explain the cleanup bug.

## Instrumentation probes

### Entity progress

`kit.entityProgress()` tracks movement only while the caller explicitly states that progress is expected.

It emits one `entity-stall` event per no-progress episode and rearms after meaningful movement.

The probe does not decide whether an entity should have a target. Gameplay/AI authority remains outside telemetry.

### State mirror

`kit.stateMirror.observe()` compares caller-provided authority and mirror values/revisions.

It emits on:

- value drift;
- stale mirror revision.

Repeated identical drift is deduplicated and a consistent sample rearms the observer.

### Revive guard

`kit.revive` observes revive attempts/completions and can report:

- self-revive;
- multiple revivers;
- stale completion;
- revive after confirmed death;
- invalid reviver.

Eligibility and transaction-current state remain caller-provided authoritative facts.

### Arena start and deferred callbacks

`kit.arenaStart` emits one double-start anomaly per arena generation when a second distinct start operation is observed.

`kit.captureGeneration()` creates a one-shot stale-callback observer around a captured generation. Repeated stale checks do not spam telemetry.

## SDK isolation

The repository boundary verifier enforces that `packages/telemetry`:

- does not import `@minecraft/server`;
- does not import Node.js built-ins;
- does not depend on analyzers/adapters/apps/orchestrator;
- may depend only on `packages/project-model` and itself.

This keeps instrumentation bundle-compatible with Bedrock while leaving Script API/version semantics in their canonical analyzer/compatibility layers.
