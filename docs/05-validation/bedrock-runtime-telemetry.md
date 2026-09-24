# Bedrock Runtime Telemetry Instrumentation

## Goal

Instrument a development build without coupling the reusable telemetry SDK to a
specific `@minecraft/server` version.

The bridge is structural: pass an object exposing `currentTick` plus a
transport callback available in the map.

## Minimal setup

```ts
const kit = createBedrockTelemetryKit({
  system,
  streamId: "arena-runtime",
  sessionId: "qa-defense-v2",
  artifactId: "art_expected",
  transport: {
    send(batch) {
      // Project-owned transport:
      // ScriptEvent, console bridge, host integration, etc.
      sendTelemetryBatch(JSON.stringify(batch));
    },
  },
});
```

The kit contains:

```text
kit.telemetry  canonical event emitter
kit.scope      mutable runtime scope lease
kit.buffer     bounded in-memory telemetry buffer
kit.flush      failure-safe batch flush controller
```

## Arena scope

Update the scope when arena/session ownership changes:

```ts
kit.scope.replace({
  arenaId: arena.id,
  arenaGeneration: arena.generation,
});

kit.scope.patch({
  playerKey: player.id,
  connectionGeneration,
});
```

Do not keep old generation values after reset/reconnect.

## Double-start instrumentation

```ts
const startGuard = createArenaStartGuard(kit.telemetry);

startGuard.observeStart({
  arenaId,
  arenaGeneration,
  operationId: countdownOperationId,
});
```

The first unique operation is accepted silently. A second distinct start
operation in the same arena generation emits one `arena-double-start` event.

Reset the guard when the arena generation is retired.

## Deferred callback instrumentation

```ts
const guard = captureDeferredGeneration(kit.telemetry, {
  subsystem: "countdown",
  callbackKind: "runTimeout",
  capturedGeneration: arenaGeneration,
  scope: {
    arenaId,
    arenaGeneration,
    operationId: countdownOperationId,
  },
});

system.runTimeout(() => {
  if (!guard.check(currentArenaGeneration, {
    scope: { arenaGeneration: currentArenaGeneration },
  })) {
    return;
  }

  startArena();
}, 20);
```

The stale callback event is emitted once per captured guard even if the callback
path checks repeatedly.

## Expected-progress stall monitor

Use only when the entity is explicitly expected to move.

```ts
const progress = createEntityProgressMonitor({
  telemetry: kit.telemetry,
  stallTicks: 40,
  minimumProgressDistance: 0.5,
});

progress.observe({
  entityKey: zombie.id,
  routeId: "bridge-route",
  tick: system.currentTick,
  position: zombie.location,
  expectedToProgress: hasValidTarget && routeActive,
  scope: {
    arenaId,
    arenaGeneration,
    entityKey: zombie.id,
    entityGeneration,
    operationId: bridgeMutationOperation,
  },
});
```

When `expectedToProgress=false`, the monitor resets instead of interpreting
intentional idle as a stall.

## Mutation lifecycle

```ts
const mutation = createMutationLifecycle(kit.telemetry, {
  operationId: "arena-7:load-bridge",
  mutationKind: "structure-load",
  routeId: "bridge-route",
  scope: {
    arenaId,
    arenaGeneration,
  },
});

placeStructure();
mutation.markApplied();

const verified = verifySentinel();
mutation.verify({
  result: verified ? "passed" : "failed",
  mechanism: "sentinel-block",
});

const routeValid = verifyRoute();
mutation.revalidateRoute({
  result: routeValid ? "passed" : "failed",
});
```

The helper rejects verification before apply and duplicate apply/verification.

## State mirror observer

```ts
observeStateMirror(kit.telemetry, {
  contractId: "ready-state",
  authority: {
    surface: { kind: "scoreboard", key: "ready" },
    value: authoritativeReady,
    revision: authorityRevision,
  },
  mirror: {
    surface: { kind: "tag", key: "ready" },
    value: tagReady,
    revision: mirrorRevision,
  },
  scope: {
    arenaId,
    arenaGeneration,
    playerKey,
  },
});
```

No event is emitted while authority and mirror agree.

## Revive completion observer

```ts
if (!observeReviveCompletion(kit.telemetry, {
  targetPlayerKey,
  reviverPlayerKey,
  targetLifeGeneration,
  currentLifeGeneration,
  targetDead,
  activeReviverCount,
  reviverEligible,
  scope: {
    arenaId,
    arenaGeneration,
    playerKey: targetPlayerKey,
    lifeGeneration: currentLifeGeneration,
  },
})) {
  // Development build can fail closed or break into a debugger.
}
```

The observer classifies self-revive, multiple-revivers, stale-revive,
revive-after-death, and invalid-reviver.

## Flush semantics

`kit.flush.flush()`:

1. snapshots the current buffer;
2. sends the full TelemetryBatch;
3. clears the buffer only after the synchronous transport succeeds.

If the transport throws, buffered events remain available for retry.

A bounded buffer records `droppedEvents` in the batch if old events had to be
evicted.

## Transport rule

The SDK deliberately does not choose a Minecraft transport. The project may
bridge batches through:

- ScriptEvent;
- development-only host integration;
- console/log capture;
- another explicit project-owned transport.

Transport failure must not mutate gameplay authority.
