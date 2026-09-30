import { describe, expect, it } from "vitest";
import {
  createBufferedTelemetrySink,
  createReviveTransactionMonitor,
  createTelemetryEmitter,
} from "../src/index.js";

describe("revive transaction monitor", () => {
  it("reports self-revive and invalid reviver anomalies once", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const monitor = createReviveTransactionMonitor(telemetry);

    monitor.observeGeneration({
      targetPlayerKey: "player-a",
      currentLifeGeneration: 3,
    });
    monitor.observeStart({
      targetPlayerKey: "player-a",
      targetLifeGeneration: 3,
      reviverPlayerKey: "player-a",
      eligible: false,
      scope: { arenaId: "arena-1", arenaGeneration: 4 },
    });
    monitor.observeStart({
      targetPlayerKey: "player-a",
      targetLifeGeneration: 3,
      reviverPlayerKey: "player-a",
      eligible: false,
    });

    expect(buffer.snapshot().map((event) => event.kind + ":" + (
      event.kind === "revive-anomaly" ? event.anomaly : ""
    ))).toEqual([
      "revive-anomaly:self-revive",
      "revive-anomaly:invalid-reviver",
    ]);
  });

  it("reports a second distinct reviver for the same life generation", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const monitor = createReviveTransactionMonitor(telemetry);

    monitor.observeStart({
      targetPlayerKey: "target",
      targetLifeGeneration: 2,
      reviverPlayerKey: "reviver-a",
      eligible: true,
    });
    monitor.observeStart({
      targetPlayerKey: "target",
      targetLifeGeneration: 2,
      reviverPlayerKey: "reviver-b",
      eligible: true,
    });

    expect(buffer.snapshot()).toEqual([
      expect.objectContaining({
        kind: "revive-anomaly",
        anomaly: "multiple-revivers",
        targetPlayerKey: "target",
        reviverPlayerKey: "reviver-b",
      }),
    ]);
  });

  it("reports stale revive work after life generation advances", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const monitor = createReviveTransactionMonitor(telemetry);

    monitor.observeGeneration({
      targetPlayerKey: "target",
      currentLifeGeneration: 5,
    });
    monitor.observeStart({
      targetPlayerKey: "target",
      targetLifeGeneration: 4,
      reviverPlayerKey: "reviver",
      eligible: true,
    });

    expect(buffer.snapshot()).toEqual([
      expect.objectContaining({
        kind: "revive-anomaly",
        anomaly: "stale-revive",
      }),
    ]);
  });

  it("reports completion after the target life was marked dead", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const monitor = createReviveTransactionMonitor(telemetry);

    monitor.observeGeneration({
      targetPlayerKey: "target",
      currentLifeGeneration: 1,
    });
    monitor.observeDeath({
      targetPlayerKey: "target",
      targetLifeGeneration: 1,
    });
    monitor.observeCompletion({
      targetPlayerKey: "target",
      targetLifeGeneration: 1,
      reviverPlayerKey: "reviver",
    });

    expect(buffer.snapshot()).toEqual([
      expect.objectContaining({
        kind: "revive-anomaly",
        anomaly: "revive-after-death",
      }),
    ]);
  });

  it("clears ownership when a monitored target is reset", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const monitor = createReviveTransactionMonitor(telemetry);

    monitor.observeStart({
      targetPlayerKey: "target",
      targetLifeGeneration: 1,
      reviverPlayerKey: "reviver-a",
      eligible: true,
    });
    monitor.reset("target");
    monitor.observeStart({
      targetPlayerKey: "target",
      targetLifeGeneration: 1,
      reviverPlayerKey: "reviver-b",
      eligible: true,
    });

    expect(buffer.size).toBe(0);
  });
});
