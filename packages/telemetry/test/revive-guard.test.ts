import { describe, expect, it } from "vitest";
import {
  createBufferedTelemetrySink,
  createReviveTelemetryGuard,
  createTelemetryEmitter,
} from "../src/index.js";

describe("revive telemetry guard", () => {
  it("detects self revive without repeated spam in one scope", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const guard = createReviveTelemetryGuard(telemetry);

    const input = {
      targetPlayerKey: "player-a",
      reviverPlayerKey: "player-a",
      scope: {
        arenaId: "arena-1",
        arenaGeneration: 3,
        lifeGeneration: 2,
      },
    };

    expect(guard.observeAttempt(input)).toEqual(["self-revive"]);
    expect(guard.observeAttempt(input)).toEqual([]);
    expect(buffer.size).toBe(1);
    expect(buffer.snapshot()[0]).toEqual(expect.objectContaining({
      kind: "revive-anomaly",
      anomaly: "self-revive",
      targetPlayerKey: "player-a",
      reviverPlayerKey: "player-a",
    }));
  });

  it("detects multiple distinct revivers for the same target scope", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const guard = createReviveTelemetryGuard(telemetry);
    const scope = {
      arenaId: "arena-1",
      arenaGeneration: 3,
      lifeGeneration: 2,
    };

    expect(guard.observeAttempt({
      targetPlayerKey: "target",
      reviverPlayerKey: "reviver-a",
      scope,
    })).toEqual([]);

    expect(guard.observeAttempt({
      targetPlayerKey: "target",
      reviverPlayerKey: "reviver-b",
      scope,
    })).toEqual(["multiple-revivers"]);

    expect(guard.observeAttempt({
      targetPlayerKey: "target",
      reviverPlayerKey: "reviver-c",
      scope,
    })).toEqual([]);

    expect(buffer.size).toBe(1);
    expect(buffer.snapshot()[0]).toEqual(expect.objectContaining({
      anomaly: "multiple-revivers",
      targetPlayerKey: "target",
      reviverPlayerKey: "reviver-b",
    }));
  });

  it("reports explicit completion anomalies independently", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const guard = createReviveTelemetryGuard(telemetry);

    const emitted = guard.observeCompletion({
      targetPlayerKey: "target",
      reviverPlayerKey: "reviver",
      scope: {
        arenaId: "arena-2",
        arenaGeneration: 8,
        lifeGeneration: 5,
      },
      transactionCurrent: false,
      targetDeadConfirmed: true,
      reviverEligible: false,
    });

    expect(emitted).toEqual([
      "revive-after-death",
      "stale-revive",
      "invalid-reviver",
    ]);
    expect(buffer.snapshot().map((event) =>
      event.kind === "revive-anomaly" ? event.anomaly : undefined
    )).toEqual([
      "revive-after-death",
      "stale-revive",
      "invalid-reviver",
    ]);
  });

  it("rearms a target after explicit reset", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const guard = createReviveTelemetryGuard(telemetry);
    const input = {
      targetPlayerKey: "player-a",
      reviverPlayerKey: "player-a",
      scope: { lifeGeneration: 2 },
    };

    guard.observeAttempt(input);
    expect(buffer.size).toBe(1);

    guard.reset("player-a");
    guard.observeAttempt(input);
    expect(buffer.size).toBe(2);
  });
});
