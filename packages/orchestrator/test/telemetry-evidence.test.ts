import { describe, expect, it } from "vitest";
import { telemetryRuntimeEvidence } from "../src/telemetry-evidence.js";

describe("telemetry evidence adapter", () => {
  it("maps observed route outcomes into scoped causal evidence", () => {
    const records = telemetryRuntimeEvidence([{
      schemaVersion: 1,
      eventId: "stall-1",
      kind: "entity-stall",
      producer: "qa",
      scope: { operationId: "mutation-1" },
      entityKey: "demo:zombie",
      routeId: "bridge",
      stalledTicks: 80,
    }, {
      schemaVersion: 1,
      eventId: "fallback-1",
      kind: "teleport-fallback",
      producer: "runtime",
      scope: { operationId: "mutation-1" },
      entityKey: "demo:zombie",
      reason: "stalled",
    }]);

    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: "navigation-stall-observed",
        state: "present",
        scope: expect.objectContaining({
          operationId: "mutation-1",
          entityKey: "demo:zombie",
        }),
      }),
      expect.objectContaining({
        predicate: "teleport-fallback-observed",
        state: "present",
      }),
    ]));
  });

  it("maps direct anomalies to explicit invariant violations", () => {
    const records = telemetryRuntimeEvidence([{
      schemaVersion: 1,
      eventId: "double-1",
      kind: "arena-double-start",
      producer: "qa",
      scope: {},
      arenaId: "arena-1",
      arenaGeneration: 9,
      startOperationIds: ["start-a", "start-b"],
    }, {
      schemaVersion: 1,
      eventId: "callback-1",
      kind: "stale-callback",
      producer: "instrumentation",
      scope: { operationId: "timer-1" },
      subsystem: "countdown",
      capturedGeneration: 8,
      currentGeneration: 9,
    }, {
      schemaVersion: 1,
      eventId: "revive-1",
      kind: "revive-anomaly",
      producer: "qa",
      scope: { arenaId: "arena-1", arenaGeneration: 9 },
      anomaly: "self-revive",
      targetPlayerKey: "player-a",
      reviverPlayerKey: "player-a",
    }]);

    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: "single-start-transaction-owner",
        state: "absent",
      }),
      expect.objectContaining({
        predicate: "current-generation-callback",
        state: "absent",
      }),
      expect.objectContaining({
        predicate: "valid-revive-transaction",
        state: "absent",
      }),
    ]));
  });

  it("maps mutation applied telemetry into timed world mutation evidence", () => {
    const records = telemetryRuntimeEvidence([{
      schemaVersion: 1,
      eventId: "mutation-1",
      kind: "mutation-applied",
      producer: "instrumentation",
      scope: { operationId: "mutation-op" },
      tick: 40,
      sequence: 3,
      mutationKind: "structure-load",
      routeId: "bridge",
    }]);

    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: "route-affecting-world-mutation",
        observedAt: {
          tick: 40,
          sequence: 3,
        },
      }),
      expect.objectContaining({
        predicate: "mutation-apply",
        state: "present",
      }),
    ]));
  });

  it("maps arena generation lifecycle anomalies into explicit invariant evidence", () => {
    const records = telemetryRuntimeEvidence([{
      schemaVersion: 1,
      eventId: "arena-generation-1",
      kind: "arena-generation-anomaly",
      producer: "instrumentation",
      scope: { operationId: "start-generation-5" },
      anomaly: "reuse-before-reset",
      arenaId: "arena-1",
      observedGeneration: 5,
      priorGeneration: 4,
      currentGeneration: 5,
    }]);

    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: "arena-generation-transition-observed",
        state: "present",
        scope: expect.objectContaining({
          arenaId: "arena-1",
          arenaGeneration: 5,
        }),
      }),
      expect.objectContaining({
        predicate: "arena-generation-transition-valid",
        state: "absent",
      }),
      expect.objectContaining({
        predicate: "arena-generation-anomaly-observed",
        state: "present",
      }),
    ]));
  });

  it("maps state drift into authority/mirror evidence", () => {
    const records = telemetryRuntimeEvidence([{
      schemaVersion: 1,
      eventId: "state-1",
      kind: "state-drift",
      producer: "instrumentation",
      scope: { arenaId: "arena-1", arenaGeneration: 3 },
      contractId: "ready",
      authority: {
        surface: { kind: "scoreboard", key: "ready" },
        value: 1,
        revision: 4,
      },
      mirror: {
        surface: { kind: "tag", key: "ready" },
        value: 0,
        revision: 3,
      },
    }]);

    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        predicate: "state-mirror-consistent",
        state: "absent",
      }),
      expect.objectContaining({
        predicate: "state-drift-observed",
        state: "present",
      }),
    ]));
  });
});
