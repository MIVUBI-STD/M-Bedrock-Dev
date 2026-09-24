import { describe, expect, it } from "vitest";
import { analyzeTelemetryContinuity } from "../src/telemetry-continuity.js";
import type { TelemetryBatch } from "../src/telemetry.js";

function batch(
  events: TelemetryBatch["events"],
  droppedEvents = 0,
): TelemetryBatch {
  return {
    schemaVersion: 1,
    ...(droppedEvents === 0 ? {} : { droppedEvents }),
    events,
  };
}

describe("telemetry continuity", () => {
  it("analyzes sequence continuity independently per stream", () => {
    const report = analyzeTelemetryContinuity(batch([
      {
        schemaVersion: 1,
        eventId: "a1",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "stream-a",
        sequence: 10,
        routeId: "a",
        result: "passed",
      },
      {
        schemaVersion: 1,
        eventId: "b1",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "stream-b",
        sequence: 50,
        routeId: "b",
        result: "passed",
      },
      {
        schemaVersion: 1,
        eventId: "a3",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "stream-a",
        sequence: 12,
        routeId: "a",
        result: "passed",
      },
      {
        schemaVersion: 1,
        eventId: "b2",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "stream-b",
        sequence: 51,
        routeId: "b",
        result: "passed",
      },
    ]));

    expect(report.streams).toHaveLength(2);
    expect(report.missingSequences).toBe(1);
    expect(report.streams.find(
      (stream) => stream.streamId === "stream-a",
    )?.gaps).toEqual([{
      after: 10,
      before: 12,
      missing: 1,
    }]);
    expect(report.streams.find(
      (stream) => stream.streamId === "stream-b",
    )?.gaps).toEqual([]);
    expect(report.incomplete).toBe(true);
  });

  it("detects duplicate and non-monotonic sequence values", () => {
    const report = analyzeTelemetryContinuity(batch([
      {
        schemaVersion: 1,
        eventId: "e1",
        kind: "mutation-verification",
        producer: "runtime",
        scope: {},
        streamId: "stream-a",
        sequence: 3,
        result: "passed",
      },
      {
        schemaVersion: 1,
        eventId: "e2",
        kind: "mutation-verification",
        producer: "runtime",
        scope: {},
        streamId: "stream-a",
        sequence: 2,
        result: "passed",
      },
      {
        schemaVersion: 1,
        eventId: "e3",
        kind: "mutation-verification",
        producer: "runtime",
        scope: {},
        streamId: "stream-a",
        sequence: 2,
        result: "failed",
      },
    ]));

    expect(report.duplicateSequences).toBe(1);
    expect(report.nonMonotonicTransitions).toBe(2);
    expect(report.incomplete).toBe(true);
  });

  it("does not assume that a stream must start at sequence one", () => {
    const report = analyzeTelemetryContinuity(batch([
      {
        schemaVersion: 1,
        eventId: "e50",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "stream-a",
        sequence: 50,
        routeId: "bridge",
        result: "passed",
      },
      {
        schemaVersion: 1,
        eventId: "e51",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "stream-a",
        sequence: 51,
        routeId: "bridge",
        result: "passed",
      },
    ]));

    expect(report.missingSequences).toBe(0);
    expect(report.incomplete).toBe(false);
  });

  it("tracks unidentified and unsequenced telemetry separately", () => {
    const report = analyzeTelemetryContinuity(batch([
      {
        schemaVersion: 1,
        eventId: "sequenced",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        sequence: 4,
        routeId: "bridge",
        result: "passed",
      },
      {
        schemaVersion: 1,
        eventId: "manual",
        kind: "route-revalidation",
        producer: "manual",
        scope: {},
        routeId: "bridge",
        result: "passed",
      },
    ], 2));

    expect(report.sequencedEvents).toBe(1);
    expect(report.unsequencedEvents).toBe(1);
    expect(report.unidentifiedStreamEvents).toBe(1);
    expect(report.droppedEvents).toBe(2);
    expect(report.incomplete).toBe(true);
  });
});
