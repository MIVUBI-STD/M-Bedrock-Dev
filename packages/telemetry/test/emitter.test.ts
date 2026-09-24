import { describe, expect, it } from "vitest";
import { parseTelemetryBatch } from "../../project-model/src/telemetry-validate.js";
import {
  createBufferedTelemetrySink,
  createCallbackTelemetrySink,
  createCounterTelemetryIdFactory,
  createFanoutTelemetrySink,
  createJsonLineTelemetrySink,
  createTelemetryEmitter,
  createTelemetryScopeLease,
  createValidatingTelemetrySink,
} from "../src/index.js";

describe("telemetry emitter sdk", () => {
  it("assigns monotonic sequence within its configured stream", () => {
    const buffer = createBufferedTelemetrySink();
    const emitter = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
      streamId: "arena-runtime",
      tickProvider: () => 42,
    });

    const first = emitter.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });
    const second = emitter.mutationApplied({
      mutationKind: "fill",
      routeId: "bridge",
    });

    expect(first).toMatchObject({
      streamId: "arena-runtime",
      sequence: 1,
      tick: 42,
    });
    expect(second).toMatchObject({
      streamId: "arena-runtime",
      sequence: 2,
      tick: 42,
    });
  });

  it("merges base, dynamic, and event scope while filling tick and timestamp", () => {
    const buffer = createBufferedTelemetrySink();
    const lease = createTelemetryScopeLease({
      arenaId: "arena-1",
      arenaGeneration: 4,
    });

    const emitter = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
      baseScope: { subsystemGeneration: 2 },
      scopeProvider: () => lease.current(),
      tickProvider: () => 120,
      timestampProvider: () => "2026-09-24T00:00:00.000Z",
      idFactory: createCounterTelemetryIdFactory("qa"),
    });

    const event = emitter.entityStall({
      entityKey: "demo:zombie",
      routeId: "bridge",
      stalledTicks: 80,
      scope: {
        entityKey: "demo:zombie",
        operationId: "mutation-1",
      },
    });

    expect(event.eventId).toBe("qa:entity-stall:1");
    expect(event.tick).toBe(120);
    expect(event.timestamp).toBe("2026-09-24T00:00:00.000Z");
    expect(event.scope).toEqual({
      subsystemGeneration: 2,
      arenaId: "arena-1",
      arenaGeneration: 4,
      entityKey: "demo:zombie",
      operationId: "mutation-1",
    });
    expect(buffer.snapshot()).toEqual([event]);
  });

  it("event fields override providers without mutating the scope lease", () => {
    const buffer = createBufferedTelemetrySink();
    const lease = createTelemetryScopeLease({ arenaId: "arena-1" });
    const emitter = createTelemetryEmitter({
      producer: "qa",
      sink: buffer,
      scopeProvider: () => lease.current(),
      tickProvider: () => 10,
      timestampProvider: () => "provider-time",
    });

    const event = emitter.routeRevalidation({
      routeId: "bridge",
      result: "passed",
      tick: 20,
      timestamp: "event-time",
      scope: { arenaGeneration: 3 },
    });

    expect(event.tick).toBe(20);
    expect(event.timestamp).toBe("event-time");
    expect(event.scope).toEqual({
      arenaId: "arena-1",
      arenaGeneration: 3,
    });
    expect(lease.current()).toEqual({ arenaId: "arena-1" });
  });

  it("buffers with a bounded ring and exports a valid telemetry batch", () => {
    const buffer = createBufferedTelemetrySink(2);
    const emitter = createTelemetryEmitter({
      producer: "runtime",
      sink: buffer,
    });

    emitter.routeRevalidation({
      routeId: "a",
      result: "passed",
    });
    emitter.routeRevalidation({
      routeId: "b",
      result: "passed",
    });
    emitter.routeRevalidation({
      routeId: "c",
      result: "failed",
    });

    expect(buffer.size).toBe(2);
    expect(buffer.dropped).toBe(1);
    const batch = buffer.batch({
      sessionId: "run-1",
      artifactId: "art-1",
    });
    expect(batch.droppedEvents).toBe(1);
    expect(parseTelemetryBatch(batch).events.map((event) => event.eventId))
      .toEqual([
        "runtime:route-revalidation:2",
        "runtime:route-revalidation:3",
      ]);
  });

  it("rejects duplicate ids across emitters sharing one buffer", () => {
    const buffer = createBufferedTelemetrySink();
    const first = createTelemetryEmitter({
      producer: "runtime",
      sink: buffer,
      idFactory: createCounterTelemetryIdFactory("shared"),
    });
    const second = createTelemetryEmitter({
      producer: "runtime",
      sink: buffer,
      idFactory: createCounterTelemetryIdFactory("shared"),
    });

    first.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });

    expect(() => second.routeRevalidation({
      routeId: "bridge",
      result: "failed",
    })).toThrow(/Duplicate telemetry eventId/);
  });

  it("supports validating, fanout, callback, and json-line sinks", () => {
    const seen: string[] = [];
    const lines: string[] = [];
    const sink = createFanoutTelemetrySink([
      createCallbackTelemetrySink((event) => seen.push(event.eventId)),
      createJsonLineTelemetrySink((line) => lines.push(line)),
    ]);
    const validating = createValidatingTelemetrySink(sink);
    const emitter = createTelemetryEmitter({
      producer: "qa",
      sink: validating,
    });

    const event = emitter.mutationVerification({
      result: "passed",
      mechanism: "sentinel",
    });

    expect(seen).toEqual([event.eventId]);
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      eventId: event.eventId,
      kind: "mutation-verification",
    });
  });
});
