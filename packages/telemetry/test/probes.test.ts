import { describe, expect, it } from "vitest";
import {
  createBufferedTelemetrySink,
  createEntityProgressProbe,
  createStateMirrorProbe,
  createTelemetryEmitter,
} from "../src/index.js";

describe("telemetry runtime probes", () => {
  it("emits one stall per no-progress episode and rearms after progress", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const probe = createEntityProgressProbe(telemetry, {
      stallTicks: 20,
      minProgressDistance: 0.5,
    });

    expect(probe.observe({
      entityKey: "demo:zombie",
      tick: 100,
      position: { x: 0, y: 64, z: 0 },
      expectedToProgress: true,
      routeId: "bridge",
      scope: { operationId: "route-op" },
    })).toBe("initialized");

    expect(probe.observe({
      entityKey: "demo:zombie",
      tick: 110,
      position: { x: 0.1, y: 64, z: 0 },
      expectedToProgress: true,
      routeId: "bridge",
      scope: { operationId: "route-op" },
    })).toBe("waiting");

    expect(probe.observe({
      entityKey: "demo:zombie",
      tick: 120,
      position: { x: 0.1, y: 64, z: 0 },
      expectedToProgress: true,
      routeId: "bridge",
      scope: { operationId: "route-op" },
    })).toBe("stalled");

    expect(buffer.size).toBe(1);
    expect(buffer.snapshot()[0]).toEqual(expect.objectContaining({
      kind: "entity-stall",
      entityKey: "demo:zombie",
      routeId: "bridge",
      stalledTicks: 20,
      tick: 120,
    }));

    expect(probe.observe({
      entityKey: "demo:zombie",
      tick: 125,
      position: { x: 0.1, y: 64, z: 0 },
      expectedToProgress: true,
      routeId: "bridge",
      scope: { operationId: "route-op" },
    })).toBe("stalled");
    expect(buffer.size).toBe(1);

    expect(probe.observe({
      entityKey: "demo:zombie",
      tick: 130,
      position: { x: 1, y: 64, z: 0 },
      expectedToProgress: true,
      routeId: "bridge",
      scope: { operationId: "route-op" },
    })).toBe("progressed");

    expect(probe.observe({
      entityKey: "demo:zombie",
      tick: 150,
      position: { x: 1, y: 64, z: 0 },
      expectedToProgress: true,
      routeId: "bridge",
      scope: { operationId: "route-op" },
    })).toBe("stalled");
    expect(buffer.size).toBe(2);
  });

  it("pauses stall detection when progress is not expected", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const probe = createEntityProgressProbe(telemetry, {
      stallTicks: 10,
    });

    expect(probe.observe({
      entityKey: "demo:zombie",
      tick: 0,
      position: { x: 0, y: 64, z: 0 },
      expectedToProgress: false,
    })).toBe("paused");

    expect(probe.observe({
      entityKey: "demo:zombie",
      tick: 100,
      position: { x: 0, y: 64, z: 0 },
      expectedToProgress: false,
    })).toBe("paused");
    expect(buffer.size).toBe(0);

    expect(probe.observe({
      entityKey: "demo:zombie",
      tick: 101,
      position: { x: 0, y: 64, z: 0 },
      expectedToProgress: true,
    })).toBe("waiting");
    expect(buffer.size).toBe(0);
  });

  it("deduplicates repeated mirror drift and rearms after consistency", () => {
    const buffer = createBufferedTelemetrySink();
    const telemetry = createTelemetryEmitter({
      producer: "instrumentation",
      sink: buffer,
    });
    const probe = createStateMirrorProbe(telemetry);

    const consistent = {
      contractId: "ready",
      authority: {
        surface: { kind: "scoreboard" as const, key: "ready" },
        value: 1,
        revision: 4,
      },
      mirror: {
        surface: { kind: "tag" as const, key: "ready" },
        value: 1,
        revision: 4,
      },
      scope: { arenaId: "arena-1", arenaGeneration: 4 },
    };

    expect(probe.observe(consistent)).toBe("consistent");
    expect(buffer.size).toBe(0);

    const drift = {
      ...consistent,
      mirror: {
        ...consistent.mirror,
        value: 0,
      },
    };

    expect(probe.observe(drift)).toBe("value-drift");
    expect(probe.observe(drift)).toBe("value-drift");
    expect(buffer.size).toBe(1);

    const changedDrift = {
      ...drift,
      authority: {
        ...drift.authority,
        revision: 5,
      },
      mirror: {
        ...drift.mirror,
        revision: 4,
      },
    };
    expect(probe.observe(changedDrift)).toBe("revision-stale");
    expect(buffer.size).toBe(2);

    expect(probe.observe({
      ...consistent,
      authority: { ...consistent.authority, revision: 5 },
      mirror: { ...consistent.mirror, revision: 5 },
    })).toBe("consistent");

    expect(probe.observe(changedDrift)).toBe("revision-stale");
    expect(buffer.size).toBe(3);
  });
});
