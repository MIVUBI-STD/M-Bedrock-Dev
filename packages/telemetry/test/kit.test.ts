import { describe, expect, it } from "vitest";
import {
  createCallbackTelemetrySink,
  createTelemetryInstrumentationKit,
} from "../src/index.js";

describe("development telemetry instrumentation kit", () => {
  it("assembles emitter, scope, guards, buffer, and optional transport", () => {
    const transported: string[] = [];
    let tick = 100;

    const kit = createTelemetryInstrumentationKit({
      producer: "instrumentation",
      maxEvents: 10,
      initialScope: {
        arenaId: "arena-1",
        arenaGeneration: 4,
      },
      tickProvider: () => tick,
      transportSink: createCallbackTelemetrySink(
        (event) => transported.push(event.eventId),
      ),
    });

    kit.arenaStart.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "start-a",
    });
    kit.arenaStart.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "start-b",
    });

    expect(kit.buffer.size).toBe(1);
    expect(transported).toHaveLength(1);
    expect(kit.buffer.snapshot()[0]).toEqual(expect.objectContaining({
      kind: "arena-double-start",
      tick: 100,
      scope: expect.objectContaining({
        arenaId: "arena-1",
        arenaGeneration: 4,
      }),
    }));

    tick = 120;
    const generation = kit.captureGeneration({
      subsystem: "countdown",
      capturedGeneration: 4,
      scope: { operationId: "countdown-4" },
    });
    expect(generation.check(5)).toBe(false);

    expect(kit.buffer.size).toBe(2);
    expect(kit.batch({ sessionId: "qa-1" })).toEqual(
      expect.objectContaining({
        schemaVersion: 1,
        sessionId: "qa-1",
        events: expect.any(Array),
      }),
    );
  });

  it("resets instrumentation state without deleting captured evidence", () => {
    const kit = createTelemetryInstrumentationKit({
      initialScope: {
        arenaId: "arena-1",
        arenaGeneration: 1,
      },
    });

    kit.arenaStart.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 1,
      operationId: "a",
    });
    kit.arenaStart.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 1,
      operationId: "b",
    });
    expect(kit.buffer.size).toBe(1);

    kit.resetRuntimeState();

    expect(kit.buffer.size).toBe(1);
    expect(kit.scope.current()).toEqual({});

    kit.scope.replace({
      arenaId: "arena-1",
      arenaGeneration: 1,
    });
    kit.arenaStart.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 1,
      operationId: "c",
    });
    kit.arenaStart.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 1,
      operationId: "d",
    });
    expect(kit.buffer.size).toBe(2);
  });

  it("resets created entity progress probes while preserving their emitted evidence", () => {
    const kit = createTelemetryInstrumentationKit();
    const progress = kit.entityProgress({
      stallTicks: 10,
      minProgressDistance: 0.5,
    });

    progress.observe({
      entityKey: "demo:zombie",
      tick: 0,
      position: { x: 0, y: 0, z: 0 },
      expectedToProgress: true,
    });
    progress.observe({
      entityKey: "demo:zombie",
      tick: 10,
      position: { x: 0, y: 0, z: 0 },
      expectedToProgress: true,
    });
    expect(kit.buffer.size).toBe(1);

    kit.resetRuntimeState();

    expect(progress.observe({
      entityKey: "demo:zombie",
      tick: 11,
      position: { x: 0, y: 0, z: 0 },
      expectedToProgress: true,
    })).toBe("initialized");
    expect(kit.buffer.size).toBe(1);
  });

  it("reports verification and drains batches atomically", () => {
    const kit = createTelemetryInstrumentationKit({
      maxEvents: 1,
    });

    kit.verify.route({
      routeId: "bridge",
      result: "passed",
      scope: { operationId: "route-op" },
    });
    kit.verify.mutation({
      result: "failed",
      mechanism: "sentinel",
      scope: { operationId: "mutation-op" },
    });

    expect(kit.buffer.size).toBe(1);
    expect(kit.buffer.dropped).toBe(1);

    const batch = kit.drainBatch({
      sessionId: "run-1",
      artifactId: "art-1",
    });

    expect(batch).toEqual(expect.objectContaining({
      schemaVersion: 1,
      sessionId: "run-1",
      artifactId: "art-1",
      droppedEvents: 1,
      events: [
        expect.objectContaining({
          kind: "mutation-verification",
          result: "failed",
          mechanism: "sentinel",
        }),
      ],
    }));
    expect(kit.buffer.size).toBe(0);
    expect(kit.buffer.dropped).toBe(0);
  });

  it("drains framed batches with session defaults", () => {
    const kit = createTelemetryInstrumentationKit({
      sessionId: "session-default",
      artifactId: "art-default",
    });

    kit.emitter.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });

    const frames = kit.drainFrames({
      batchId: "frame-batch",
      maxPayloadCharacters: 32,
    });

    expect(frames.length).toBeGreaterThan(1);
    expect(kit.buffer.size).toBe(0);
    expect(frames.every(
      (frame) => frame.batchId === "frame-batch",
    )).toBe(true);
  });

  it("can clear evidence independently or clear everything", () => {
    const kit = createTelemetryInstrumentationKit({
      initialScope: { arenaId: "arena-1" },
    });

    kit.emitter.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });
    expect(kit.buffer.size).toBe(1);

    kit.clearBuffer();
    expect(kit.buffer.size).toBe(0);
    expect(kit.scope.current()).toEqual({ arenaId: "arena-1" });

    kit.emitter.routeRevalidation({
      routeId: "bridge",
      result: "failed",
    });
    kit.clearAll();

    expect(kit.buffer.size).toBe(0);
    expect(kit.scope.current()).toEqual({});
  });
  it("uses configured batch metadata and validates events by default", () => {
    const kit = createTelemetryInstrumentationKit({
      sessionId: "qa-run-1",
      artifactId: "art-1",
    });

    kit.emitter.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });

    expect(kit.batch()).toEqual(expect.objectContaining({
      schemaVersion: 1,
      sessionId: "qa-run-1",
      artifactId: "art-1",
      events: expect.any(Array),
    }));

    expect(() => kit.emitter.emit({
      schemaVersion: 1,
      eventId: "",
      kind: "route-revalidation",
      producer: "instrumentation",
      scope: {},
      routeId: "bridge",
      result: "passed",
    })).toThrow(/Invalid emitted telemetry event/);
  });

  it("can disable validation explicitly", () => {
    const kit = createTelemetryInstrumentationKit({
      validateEvents: false,
    });

    expect(() => kit.emitter.emit({
      schemaVersion: 1,
      eventId: "",
      kind: "route-revalidation",
      producer: "instrumentation",
      scope: {},
      routeId: "bridge",
      result: "passed",
    })).not.toThrow();
    expect(kit.buffer.size).toBe(1);
  });

  it("shares kit scope and tick with active runtime probes", () => {
    const requests: unknown[] = [];
    const kit = createTelemetryInstrumentationKit({
      baseScope: { subsystemGeneration: 3 },
      initialScope: { arenaId: "arena-2", arenaGeneration: 9 },
      scopeProvider: () => ({ operationId: "bridge-op" }),
      tickProvider: () => 240,
      activeProbeTransport: {
        send: (request) => requests.push(request),
      },
      probeRequestIdFactory: () => "probe-1",
    });

    expect(kit.activeProbe).toBeDefined();
    const request = kit.activeProbe!.request({
      probeId: "chunk-ready",
      predicate: "bridge-chunk-loaded",
      query: {
        kind: "chunk-loaded",
        dimension: "overworld",
        location: { x: 100, y: 64, z: 100 },
      },
      outcomeByState: {
        present: "ready",
        absent: "not-ready",
      },
    });

    expect(request.runtimeTick).toBe(240);
    expect(request.scope).toEqual({
      subsystemGeneration: 3,
      arenaId: "arena-2",
      arenaGeneration: 9,
      operationId: "bridge-op",
    });
    expect(requests).toEqual([request]);
  });

});
