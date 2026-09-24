import type { TelemetryEvent } from "../../project-model/src/telemetry.js";
import type { TelemetrySink } from "./types.js";

export type TelemetryRuntimeProfileName =
  | "off"
  | "critical"
  | "qa"
  | "full";

export interface TelemetryRuntimeProfile {
  name: TelemetryRuntimeProfileName;
  continuousMonitoring: boolean;
  activeProbes: boolean;
  allow(event: TelemetryEvent): boolean;
}

function isFailedVerification(event: TelemetryEvent): boolean {
  return (
    (event.kind === "route-revalidation" ||
      event.kind === "mutation-verification") &&
    event.result === "failed"
  );
}

function isCriticalEvent(event: TelemetryEvent): boolean {
  return (
    event.kind === "arena-double-start" ||
    event.kind === "arena-generation-anomaly" ||
    event.kind === "stale-callback" ||
    event.kind === "revive-anomaly" ||
    event.kind === "state-drift" ||
    isFailedVerification(event)
  );
}

export function telemetryRuntimeProfile(
  name: TelemetryRuntimeProfileName,
): TelemetryRuntimeProfile {
  switch (name) {
    case "off":
      return {
        name,
        continuousMonitoring: false,
        activeProbes: false,
        allow: () => false,
      };
    case "critical":
      return {
        name,
        continuousMonitoring: false,
        activeProbes: false,
        allow: isCriticalEvent,
      };
    case "qa":
      return {
        name,
        continuousMonitoring: true,
        activeProbes: false,
        allow: () => true,
      };
    case "full":
      return {
        name,
        continuousMonitoring: true,
        activeProbes: true,
        allow: () => true,
      };
  }
}

export function resolveTelemetryRuntimeProfile(
  profile:
    | TelemetryRuntimeProfileName
    | TelemetryRuntimeProfile
    | undefined,
): TelemetryRuntimeProfile {
  if (profile === undefined) return telemetryRuntimeProfile("qa");
  return typeof profile === "string"
    ? telemetryRuntimeProfile(profile)
    : profile;
}

export function createProfileTelemetrySink(
  sink: TelemetrySink,
  profile:
    | TelemetryRuntimeProfileName
    | TelemetryRuntimeProfile,
): TelemetrySink {
  const resolved = resolveTelemetryRuntimeProfile(profile);
  return {
    emit(event) {
      if (resolved.allow(event)) sink.emit(event);
    },
  };
}
