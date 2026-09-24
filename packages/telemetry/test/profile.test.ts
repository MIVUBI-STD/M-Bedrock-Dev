import { describe, expect, it } from "vitest";
import type { TelemetryEvent } from "../../project-model/src/telemetry.js";
import {
  createBufferedTelemetrySink,
  createProfileTelemetrySink,
  telemetryRuntimeProfile,
} from "../src/index.js";

function event(
  kind: TelemetryEvent["kind"],
  extra: Record<string, unknown> = {},
): TelemetryEvent {
  return {
    schemaVersion: 1,
    eventId: "event-" + kind,
    kind,
    producer: "instrumentation",
    scope: {},
    ...extra,
  } as TelemetryEvent;
}

describe("telemetry runtime profiles", () => {
  it("defaults to full for backward compatibility", () => {
    const profile = telemetryRuntimeProfile("full");
    expect(profile.name).toBe("full");
    expect(profile.continuousMonitoring).toBe(true);
    expect(profile.activeProbes).toBe(true);
  });
  it("off drops every event", () => {
    const buffer = createBufferedTelemetrySink();
    const sink = createProfileTelemetrySink(buffer, "off");

    sink.emit(event("arena-double-start", {
      arenaId: "arena-1",
      arenaGeneration: 1,
    }));
    sink.emit(event("entity-stall", {
      entityKey: "demo:zombie",
    }));

    expect(buffer.size).toBe(0);
  });

  it("critical keeps invariant anomalies and failed verification only", () => {
    const buffer = createBufferedTelemetrySink();
    const sink = createProfileTelemetrySink(buffer, "critical");

    sink.emit(event("arena-double-start", {
      arenaId: "arena-1",
      arenaGeneration: 1,
    }));
    sink.emit(event("route-revalidation", {
      routeId: "bridge",
      result: "passed",
    }));
    sink.emit(event("route-revalidation", {
      routeId: "bridge",
      result: "failed",
    }));
    sink.emit(event("mutation-applied", {
      mutationKind: "fill",
    }));
    sink.emit(event("entity-stall", {
      entityKey: "demo:zombie",
    }));

    expect(buffer.snapshot().map((item) => item.kind)).toEqual([
      "arena-double-start",
      "route-revalidation",
    ]);
    expect(
      buffer.snapshot().find((item) => item.kind === "route-revalidation"),
    ).toMatchObject({ result: "failed" });
  });

  it("qa enables continuous monitoring but not active probes", () => {
    const profile = telemetryRuntimeProfile("qa");
    expect(profile.continuousMonitoring).toBe(true);
    expect(profile.activeProbes).toBe(false);
  });

  it("full enables continuous monitoring and active probes", () => {
    const profile = telemetryRuntimeProfile("full");
    expect(profile.continuousMonitoring).toBe(true);
    expect(profile.activeProbes).toBe(true);
  });
});
