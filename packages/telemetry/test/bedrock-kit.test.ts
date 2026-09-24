import { describe, expect, it } from "vitest";
import {
  createBedrockTelemetryKit,
  createCallbackTelemetrySink,
} from "../src/index.js";

describe("Bedrock telemetry kit", () => {
  it("composes validation, buffering, mirroring, scope, and flush", () => {
    const system = { currentTick: 50 };
    const mirrored: string[] = [];
    const sent: unknown[] = [];

    const kit = createBedrockTelemetryKit({
      system,
      streamId: "arena-runtime",
      sessionId: "qa-run",
      artifactId: "art-1",
      baseScope: { subsystemGeneration: 2 },
      mirrorSink: createCallbackTelemetrySink((event) => {
        mirrored.push(event.eventId);
      }),
      transport: {
        send(batch) {
          sent.push(batch);
        },
      },
    });

    kit.scope.replace({
      arenaId: "arena-1",
      arenaGeneration: 7,
    });

    const event = kit.telemetry.entityStall({
      entityKey: "demo:zombie",
      stalledTicks: 40,
      scope: {
        entityKey: "demo:zombie",
        operationId: "route-op",
      },
    });

    expect(event.tick).toBe(50);
    expect(event.streamId).toBe("arena-runtime");
    expect(kit.buffer.size).toBe(1);
    expect(mirrored).toEqual([event.eventId]);

    const batch = kit.flush.flush();
    expect(batch).toMatchObject({
      schemaVersion: 1,
      sessionId: "qa-run",
      artifactId: "art-1",
    });
    expect(sent).toHaveLength(1);
    expect(kit.buffer.size).toBe(0);
  });

  it("honors minimum flush events", () => {
    const sent: unknown[] = [];
    const kit = createBedrockTelemetryKit({
      system: { currentTick: 1 },
      minimumFlushEvents: 2,
      transport: {
        send(batch) {
          sent.push(batch);
        },
      },
    });

    kit.telemetry.routeRevalidation({
      routeId: "bridge",
      result: "passed",
    });
    expect(kit.flush.flush()).toBeUndefined();
    expect(kit.buffer.size).toBe(1);

    kit.telemetry.routeRevalidation({
      routeId: "bridge",
      result: "failed",
    });
    expect(kit.flush.flush()).toBeDefined();
    expect(sent).toHaveLength(1);
  });
});
