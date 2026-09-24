import { describe, expect, it } from "vitest";
import { analyzeTelemetryIntegrity } from "../src/telemetry-integrity.js";

describe("telemetry stream integrity", () => {
  it("accepts a contiguous ordered stream", () => {
    const report = analyzeTelemetryIntegrity({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "a",
        kind: "mutation-applied",
        producer: "runtime",
        scope: {},
        streamId: "arena",
        sequence: 1,
        mutationKind: "fill",
      }, {
        schemaVersion: 1,
        eventId: "b",
        kind: "mutation-verification",
        producer: "runtime",
        scope: {},
        streamId: "arena",
        sequence: 2,
        result: "passed",
      }],
    });

    expect(report.complete).toBe(true);
    expect(report.issues).toEqual([]);
    expect(report.streams.arena).toEqual({
      events: 2,
      firstSequence: 1,
      lastSequence: 2,
    });
  });

  it("detects gaps and marks whether dropped events can explain them", () => {
    const unexplained = analyzeTelemetryIntegrity({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "a",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "arena",
        sequence: 1,
        routeId: "bridge",
        result: "passed",
      }, {
        schemaVersion: 1,
        eventId: "b",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "arena",
        sequence: 3,
        routeId: "bridge",
        result: "failed",
      }],
    });

    expect(unexplained.complete).toBe(false);
    expect(unexplained.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "sequence-gap",
        gap: 1,
        explainedByDroppedEvents: false,
      }),
    ]));

    const explained = analyzeTelemetryIntegrity({
      schemaVersion: 1,
      droppedEvents: 1,
      events: unexplained.streams.arena
        ? [{
            schemaVersion: 1,
            eventId: "a",
            kind: "route-revalidation",
            producer: "runtime",
            scope: {},
            streamId: "arena",
            sequence: 1,
            routeId: "bridge",
            result: "passed",
          }, {
            schemaVersion: 1,
            eventId: "b",
            kind: "route-revalidation",
            producer: "runtime",
            scope: {},
            streamId: "arena",
            sequence: 3,
            routeId: "bridge",
            result: "failed",
          }]
        : [],
    });

    expect(explained.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "dropped-events",
        droppedEvents: 1,
      }),
      expect.objectContaining({
        kind: "sequence-gap",
        explainedByDroppedEvents: true,
      }),
    ]));
  });

  it("detects duplicate and regressing sequence values", () => {
    const report = analyzeTelemetryIntegrity({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "a",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "arena",
        sequence: 2,
        routeId: "bridge",
        result: "passed",
      }, {
        schemaVersion: 1,
        eventId: "b",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "arena",
        sequence: 2,
        routeId: "bridge",
        result: "passed",
      }, {
        schemaVersion: 1,
        eventId: "c",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "arena",
        sequence: 1,
        routeId: "bridge",
        result: "failed",
      }],
    });

    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "duplicate-sequence" }),
      expect.objectContaining({ kind: "sequence-regression" }),
    ]));
  });

  it("detects stream/sequence shape mismatches", () => {
    const report = analyzeTelemetryIntegrity({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "a",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        sequence: 1,
        routeId: "bridge",
        result: "passed",
      }, {
        schemaVersion: 1,
        eventId: "b",
        kind: "route-revalidation",
        producer: "runtime",
        scope: {},
        streamId: "arena",
        routeId: "bridge",
        result: "passed",
      }],
    });

    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "sequence-without-stream" }),
      expect.objectContaining({ kind: "stream-missing-sequence" }),
    ]));
  });
});
