import { describe, expect, it } from "vitest";
import type { TelemetryEvent } from "../../project-model/src/index.js";
import {
  createPriorityBufferedTelemetrySink,
  telemetryEventPriority,
} from "../src/index.js";

function event(
  id: string,
  kind: TelemetryEvent["kind"],
  extra: Record<string, unknown> = {},
): TelemetryEvent {
  return {
    schemaVersion: 1,
    eventId: id,
    kind,
    producer: "instrumentation",
    scope: {},
    ...extra,
  } as TelemetryEvent;
}

describe("priority telemetry buffer", () => {
  it("evicts lower-priority observations for a critical anomaly", () => {
    const buffer = createPriorityBufferedTelemetrySink(2);

    buffer.emit(event("low-1", "mutation-applied", {
      mutationKind: "fill",
    }));
    buffer.emit(event("normal-1", "route-revalidation", {
      routeId: "bridge",
      result: "passed",
    }));
    buffer.emit(event("critical-1", "stale-callback", {
      subsystem: "countdown",
      capturedGeneration: 1,
      currentGeneration: 2,
    }));

    expect(buffer.snapshot().map((item) => item.eventId)).toEqual([
      "normal-1",
      "critical-1",
    ]);
    expect(buffer.dropped).toBe(1);
    expect(buffer.droppedByPriority()).toEqual({
      low: 1,
      normal: 0,
      high: 0,
      critical: 0,
    });
  });

  it("does not let lower or equal priority replace retained critical evidence", () => {
    const buffer = createPriorityBufferedTelemetrySink(1);

    buffer.emit(event("critical-1", "arena-double-start", {
      arenaId: "arena-1",
      arenaGeneration: 2,
    }));
    buffer.emit(event("high-1", "entity-stall", {
      entityKey: "demo:zombie",
    }));
    buffer.emit(event("critical-2", "stale-callback", {
      subsystem: "timer",
      capturedGeneration: 1,
      currentGeneration: 2,
    }));

    expect(buffer.snapshot().map((item) => item.eventId)).toEqual([
      "critical-1",
    ]);
    expect(buffer.dropped).toBe(2);
    expect(buffer.droppedByPriority()).toEqual({
      low: 0,
      normal: 0,
      high: 1,
      critical: 1,
    });
  });

  it("classifies downstream observations above routine mutation noise", () => {
    expect(telemetryEventPriority(event("a", "mutation-applied", {
      mutationKind: "fill",
    }))).toBe("low");
    expect(telemetryEventPriority(event("b", "entity-stall", {
      entityKey: "demo:zombie",
    }))).toBe("high");
    expect(telemetryEventPriority(event("c", "mutation-verification", {
      result: "failed",
    }))).toBe("critical");
  });

  it("preserves dropped count in exported batches", () => {
    const buffer = createPriorityBufferedTelemetrySink(1);
    buffer.emit(event("low-1", "mutation-applied", {
      mutationKind: "fill",
    }));
    buffer.emit(event("critical-1", "state-drift", {
      contractId: "ready",
      authority: {
        surface: { kind: "scoreboard", key: "ready" },
        value: 1,
      },
      mirror: {
        surface: { kind: "tag", key: "ready" },
        value: 0,
      },
    }));

    expect(buffer.batch()).toMatchObject({
      schemaVersion: 1,
      droppedEvents: 1,
      events: [
        expect.objectContaining({ eventId: "critical-1" }),
      ],
    });
  });
});
