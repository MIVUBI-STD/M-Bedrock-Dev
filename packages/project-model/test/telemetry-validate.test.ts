import { describe, expect, it } from "vitest";
import {
  parseTelemetryBatch,
  validateTelemetryBatch,
} from "../src/telemetry-validate.js";

describe("telemetry validation", () => {
  it("accepts a standardized telemetry batch", () => {
    const batch = parseTelemetryBatch({
      schemaVersion: 1,
      sessionId: "qa-1",
      events: [{
        schemaVersion: 1,
        eventId: "stall-1",
        kind: "entity-stall",
        producer: "qa",
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 4,
          entityKey: "demo:zombie",
          operationId: "mutation-1",
        },
        entityKey: "demo:zombie",
        routeId: "bridge",
        stalledTicks: 60,
      }],
    });

    expect(batch.events).toHaveLength(1);
  });

  it("accepts typed state observation telemetry", () => {
    const batch = parseTelemetryBatch({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "state-1",
        kind: "state-observation",
        producer: "instrumentation",
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 2,
        },
        path: "session.phase",
        value: "active",
      }],
    });

    expect(batch.events[0]?.kind).toBe("state-observation");
  });

  it("accepts gameplay outcome telemetry", () => {
    const batch = parseTelemetryBatch({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "outcome-1",
        kind: "gameplay-outcome",
        producer: "instrumentation",
        scope: {
          arenaId: "arena-1",
          arenaGeneration: 2,
        },
        outcomeId: "outcome:decide-reconnect-cleanup",
      }],
    });

    expect(batch.events[0]?.kind).toBe("gameplay-outcome");
  });

  it("rejects duplicate event ids and malformed event payloads", () => {
    const errors = validateTelemetryBatch({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "same",
        kind: "arena-double-start",
        producer: "qa",
        scope: {},
        arenaId: "arena-1",
      }, {
        schemaVersion: 1,
        eventId: "same",
        kind: "unknown-event",
        producer: "qa",
        scope: {},
      }],
    });

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/arenaGeneration/),
      expect.stringMatching(/unsupported/),
      "Duplicate telemetry eventId: same",
    ]));
  });
});
