import { describe, expect, it } from "vitest";
import {
  captureDeferredGeneration,
  createArenaStartGuard,
  createBufferedTelemetrySink,
  createTelemetryEmitter,
} from "../src/index.js";

describe("telemetry instrumentation guards", () => {
  it("emits double-start only for a distinct second operation in one arena generation", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const guard = createArenaStartGuard(telemetry);

    guard.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "start-a",
    });
    guard.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "start-a",
    });
    expect(buffer.size).toBe(0);

    guard.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "start-b",
    });

    expect(buffer.snapshot()).toEqual([
      expect.objectContaining({
        kind: "arena-double-start",
        arenaId: "arena-1",
        arenaGeneration: 4,
        startOperationIds: ["start-a", "start-b"],
      }),
    ]);

    guard.reset("arena-1", 4);
    guard.observeStart({
      arenaId: "arena-1",
      arenaGeneration: 4,
      operationId: "start-c",
    });
    expect(buffer.size).toBe(1);
  });

  it("emits stale-callback telemetry when a captured generation no longer matches", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
      baseScope: { arenaId: "arena-2" },
    });

    const guard = captureDeferredGeneration(telemetry, {
      subsystem: "countdown",
      callbackKind: "runTimeout",
      capturedGeneration: 7,
      scope: { operationId: "countdown-7" },
    });

    expect(guard.check(7)).toBe(true);
    expect(buffer.size).toBe(0);

    expect(guard.check(8, {
      scope: { arenaGeneration: 8 },
      tick: 240,
    })).toBe(false);

    expect(buffer.snapshot()).toEqual([
      expect.objectContaining({
        kind: "stale-callback",
        subsystem: "countdown",
        callbackKind: "runTimeout",
        capturedGeneration: 7,
        currentGeneration: 8,
        tick: 240,
        scope: {
          arenaId: "arena-2",
          operationId: "countdown-7",
          arenaGeneration: 8,
        },
      }),
    ]);
  });
});
