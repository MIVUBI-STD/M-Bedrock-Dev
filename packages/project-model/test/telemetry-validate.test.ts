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

  it("accepts route observation telemetry", () => {
    const batch = parseTelemetryBatch({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "route-1",
        kind: "route-observation",
        producer: "instrumentation",
        scope: {
          arenaId: "arena_6",
          arenaGeneration: 3,
        },
        entityKey: "demo:zombie",
        routeId: "bridge",
        routeIndex: 606,
        worldLocation: {
          x: 1778,
          y: -30,
          z: 0,
        },
      }],
    });

    expect(batch.events[0]?.kind).toBe("route-observation");
  });

  it("rejects malformed route observation coordinates", () => {
    const errors = validateTelemetryBatch({
      schemaVersion: 1,
      events: [{
        schemaVersion: 1,
        eventId: "route-bad",
        kind: "route-observation",
        producer: "qa",
        scope: {},
        entityKey: "demo:zombie",
        routeIndex: 1.5,
        worldLocation: {
          x: 1,
          y: "bad",
          z: 2,
        },
      }],
    });

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/routeIndex must be an integer/),
      expect.stringMatching(/worldLocation\.y/),
    ]));
  });

  it("accepts navigation target and reachability telemetry", () => {
    const batch = parseTelemetryBatch({
      schemaVersion: 1,
      events: [
        {
          schemaVersion: 1,
          eventId: "nav-1",
          kind: "navigation-target-observation",
          producer: "instrumentation",
          scope: {
            arenaId: "arena_6",
            arenaGeneration: 3,
          },
          entityKey: "demo:zombie",
          routeId: "bridge",
          routeIndex: 606,
          targetLocation: {
            x: 1778,
            y: -28.5,
            z: 0.5,
          },
          mechanism: "moveToLocation",
        },
        {
          schemaVersion: 1,
          eventId: "reach-1",
          kind: "route-reachability-observation",
          producer: "instrumentation",
          scope: {
            arenaId: "arena_6",
            arenaGeneration: 3,
          },
          entityKey: "demo:zombie",
          routeId: "bridge",
          routeIndex: 606,
          reachable: true,
          mechanism: "gametest-path-check",
        },
      ],
    });

    expect(batch.events.map((event) => event.kind)).toEqual([
      "navigation-target-observation",
      "route-reachability-observation",
    ]);
  });

  it("rejects malformed navigation evidence", () => {
    const errors = validateTelemetryBatch({
      schemaVersion: 1,
      events: [
        {
          schemaVersion: 1,
          eventId: "nav-bad",
          kind: "navigation-target-observation",
          producer: "qa",
          scope: {},
          entityKey: "demo:zombie",
          targetLocation: {
            x: 1,
            y: "bad",
            z: 2,
          },
        },
        {
          schemaVersion: 1,
          eventId: "reach-bad",
          kind: "route-reachability-observation",
          producer: "qa",
          scope: {},
          entityKey: "demo:zombie",
          reachable: "yes",
        },
      ],
    });

    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/targetLocation\.y/),
      expect.stringMatching(/reachable must be boolean/),
    ]));
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
