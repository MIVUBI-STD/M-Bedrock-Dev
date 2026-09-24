import { describe, expect, it } from "vitest";
import {
  createCallbackTelemetrySink,
  createTelemetrySession,
} from "../src/index.js";

describe("telemetry instrumentation session", () => {
  it("composes emitter, scope, guards, probes, transport, and batching", () => {
    const transported: string[] = [];
    let tick = 10;

    const session = createTelemetrySession({
      producer: "instrumentation",
      sessionId: "qa-run-1",
      artifactId: "art-1",
      maxEvents: 16,
      baseScope: { subsystemGeneration: 2 },
      initialScope: {
        arenaId: "arena-1",
        arenaGeneration: 4,
      },
      tickProvider: () => tick,
      transportSink: createCallbackTelemetrySink((event) => {
        transported.push(event.eventId);
      }),
    });

    session.telemetry.routeRevalidation({
      routeId: "bridge",
      result: "passed",
      scope: { operationId: "route-op" },
    });

    session.arenaStart.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "start-a",
    });
    session.arenaStart.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "start-b",
    });

    tick = 20;
    const generation = session.captureDeferredGeneration({
      subsystem: "countdown",
      capturedGeneration: 4,
      scope: { operationId: "countdown-4" },
    });
    expect(generation.check(5)).toBe(false);

    const progress = session.createEntityProgressProbe({
      stallTicks: 5,
      minProgressDistance: 0.25,
    });
    progress.observe({
      entityKey: "demo:zombie",
      tick: 20,
      position: { x: 0, y: 64, z: 0 },
      expectedToProgress: true,
      routeId: "bridge",
      scope: { operationId: "route-op" },
    });
    progress.observe({
      entityKey: "demo:zombie",
      tick: 25,
      position: { x: 0, y: 64, z: 0 },
      expectedToProgress: true,
      routeId: "bridge",
      scope: { operationId: "route-op" },
    });

    const batch = session.batch();
    expect(batch.sessionId).toBe("qa-run-1");
    expect(batch.artifactId).toBe("art-1");
    expect(batch.events.map((event) => event.kind)).toEqual([
      "route-revalidation",
      "arena-double-start",
      "stale-callback",
      "entity-stall",
    ]);
    expect(transported).toHaveLength(4);
    expect(session.buffer.size).toBe(4);

    session.reset();
    expect(session.buffer.size).toBe(0);
    expect(session.buffer.dropped).toBe(0);
    expect(session.scope.current()).toEqual({});

    session.arenaStart.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "start-c",
    });
    expect(session.buffer.size).toBe(0);
  });

  it("validates emitted events by default", () => {
    const session = createTelemetrySession({
      producer: "qa",
    });

    expect(() => session.telemetry.emit({
      schemaVersion: 1,
      eventId: "",
      kind: "route-revalidation",
      producer: "qa",
      scope: {},
      routeId: "bridge",
      result: "passed",
    })).toThrow(/Invalid emitted telemetry event/);
  });
});
