import { describe, expect, it } from "vitest";
import {
  createBufferedTelemetrySink,
  createTelemetryEmitter,
  emitTeleportFallback,
  observeReviveCompletion,
  observeStateMirror,
} from "../src/index.js";

describe("telemetry observer helpers", () => {
  it("emits state drift only when value or revision diverges", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });

    expect(observeStateMirror(telemetry, {
      contractId: "ready",
      authority: {
        surface: { kind: "scoreboard", key: "ready" },
        value: 1,
        revision: 4,
      },
      mirror: {
        surface: { kind: "tag", key: "ready" },
        value: 1,
        revision: 4,
      },
    })).toBe(true);
    expect(buffer.size).toBe(0);

    expect(observeStateMirror(telemetry, {
      contractId: "ready",
      authority: {
        surface: { kind: "scoreboard", key: "ready" },
        value: 1,
        revision: 5,
      },
      mirror: {
        surface: { kind: "tag", key: "ready" },
        value: 1,
        revision: 4,
      },
    })).toBe(false);

    expect(buffer.snapshot()[0]).toMatchObject({
      kind: "state-drift",
      contractId: "ready",
    });
  });

  it("classifies revive anomalies deterministically", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });

    expect(observeReviveCompletion(telemetry, {
      targetPlayerKey: "player-a",
      reviverPlayerKey: "player-a",
    })).toBe(false);

    expect(buffer.snapshot()[0]).toMatchObject({
      kind: "revive-anomaly",
      anomaly: "self-revive",
      targetPlayerKey: "player-a",
      reviverPlayerKey: "player-a",
    });

    buffer.clear();
    expect(observeReviveCompletion(telemetry, {
      targetPlayerKey: "player-a",
      reviverPlayerKey: "player-b",
      targetLifeGeneration: 2,
      currentLifeGeneration: 3,
    })).toBe(false);
    expect(buffer.snapshot()[0]).toMatchObject({
      anomaly: "stale-revive",
    });
  });

  it("does not emit for a valid revive completion", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });

    expect(observeReviveCompletion(telemetry, {
      targetPlayerKey: "player-a",
      reviverPlayerKey: "player-b",
      targetLifeGeneration: 2,
      currentLifeGeneration: 2,
      targetDead: false,
      activeReviverCount: 1,
      reviverEligible: true,
    })).toBe(true);
    expect(buffer.size).toBe(0);
  });

  it("requires an entity or player for teleport fallback", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });

    expect(() => emitTeleportFallback(telemetry, {
      reason: "stalled",
    })).toThrow(/entityKey or playerKey/);

    emitTeleportFallback(telemetry, {
      entityKey: "demo:zombie",
      routeId: "bridge",
      reason: "stalled",
    });
    expect(buffer.snapshot()[0]).toMatchObject({
      kind: "teleport-fallback",
      entityKey: "demo:zombie",
      routeId: "bridge",
    });
  });
});
