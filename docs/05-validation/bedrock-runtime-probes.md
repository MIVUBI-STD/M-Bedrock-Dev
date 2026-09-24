# Bedrock Runtime Probe Instrumentation

## Purpose

Runtime probes answer narrow questions that static analysis cannot safely prove.

Supported queries are intentionally bounded:

```text
chunk-loaded
entity-resolvable
tag-present
scoreboard-value
```

There is no arbitrary command probe.

## Runtime side

Create a backend from project-owned runtime lookups:

```ts
const executor = createRuntimeProbeExecutor({
  get currentTick() {
    return system.currentTick;
  },

  chunkLoaded(dimensionId, location) {
    try {
      const dimension = world.getDimension(dimensionId);
      return {
        status: "value",
        value: dimension.isChunkLoaded(location),
      };
    } catch (error) {
      return {
        status: "unknown",
        error: String(error),
      };
    }
  },

  entityResolvable(entityId) {
    // Use the project's authoritative entity registry.
    const entity = entities.get(entityId);
    if (!entity) return { status: "missing" };

    try {
      return {
        status: "value",
        value: entity.isValid,
      };
    } catch (error) {
      return {
        status: "unknown",
        error: String(error),
      };
    }
  },

  tagPresent(subjectKind, subjectId, tag) {
    const subject = resolveSubject(subjectKind, subjectId);
    if (!subject) return { status: "missing" };

    try {
      return {
        status: "value",
        value: subject.hasTag(tag),
      };
    } catch (error) {
      return {
        status: "unknown",
        error: String(error),
      };
    }
  },

  scoreboardValue(objectiveId, participant) {
    const objective = world.scoreboard.getObjective(objectiveId);
    if (!objective) return { status: "missing" };

    try {
      const value = readProjectScore(objective, participant);
      return value === undefined
        ? { status: "missing" }
        : { status: "value", value };
    } catch (error) {
      return {
        status: "unknown",
        error: String(error),
      };
    }
  },
});
```

The executor itself does not import `@minecraft/server`. The application owns how
entities, dimensions, and scoreboard participants are resolved.

## Session recorder

```ts
const probes = createRuntimeProbeSession({
  executor,
  maxExchanges: 256,
  sessionId: "qa-defense-v2",
  artifactId: "art_expected",
});
```

Execute typed requests:

```ts
const response = probes.execute({
  schemaVersion: 1,
  requestId: "chunk-arena-1-load-7",
  probeId: "arena-loader-chunk",
  predicate: "loaded-target-chunk",
  scope: {
    arenaId: "arena-1",
    arenaGeneration: 7,
    operationId: "arena-1:load-7",
  },
  runtimeTick: system.currentTick,
  query: {
    kind: "chunk-loaded",
    dimension: "overworld",
    location: { x: 100, y: 64, z: 200 },
  },
  outcomeByState: {
    present: "ready",
    absent: "not-ready",
    unknown: "unknown",
  },
});
```

The response includes observed RuntimeEvidence with the same predicate and scope.

## Unknown vs absent

Backend result semantics are strict:

```text
{ status: "value", value: true/false }
    → observed present/absent

{ status: "missing" }
    → observed absent

{ status: "unknown", error }
    → failed probe + unknown evidence
```

Exceptions are converted to unknown evidence rather than crashing gameplay or being
misreported as absence.

## Transcript

```ts
const transcript = probes.snapshot();
```

Output:

```json
{
  "schemaVersion": 1,
  "sessionId": "qa-defense-v2",
  "artifactId": "art_expected",
  "exchanges": [
    {
      "request": {},
      "response": {}
    }
  ]
}
```

The session uses bounded retention. If old exchanges are evicted:

```json
{
  "droppedExchanges": 3
}
```

The inspector reports this as incomplete runtime-proof coverage rather than
silently assuming the retained transcript is complete.

## Request identity

`requestId` must remain unique for the entire RuntimeProbeSession.

`drainTranscript()` clears retained exchanges but intentionally does not allow a
previous request ID to be reused. Use `clear()` only when intentionally starting
a new request-ID namespace.

## Import into analyzer

```text
npm run cli -- inspect map.mcworld \
  --edition bedrock \
  --version <minecraft-version> \
  --probe-transcript qa/probes.json
```

The transcript may declare `artifactId`. A mismatch against the inspected
artifact is rejected.

## Trust boundary

A valid response must preserve:

- requestId;
- probeId;
- evidence predicate;
- requested scope;
- runtime tick ordering;
- state/outcome mapping.

Successful responses require `observed` evidence.
Failed probes require `unknown` evidence plus an error.

## Combined runtime proof workflow

Telemetry and probes solve different problems.

```text
Telemetry
  → spontaneous observations/anomalies
  → stall, fallback, stale callback, double start, drift

Runtime probes
  → deliberate bounded questions
  → is chunk loaded?
  → can entity be resolved?
  → is tag present?
  → what is scoreboard value?
```

They converge as RuntimeEvidenceRecord entries in the same knowledge/causal engine.

A recommended QA flow:

```text
static inspect
↓
diagnostic evidence gaps
↓
select cheapest discriminating runtime probes
↓
instrumented reproduction
↓
telemetry + probe transcript
↓
inspect again
↓
root-cause candidates strengthened or rejected
```
