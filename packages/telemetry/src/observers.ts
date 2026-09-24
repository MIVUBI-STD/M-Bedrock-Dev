import type {
  StateObservedValue,
  StateSurfaceRef,
} from "../../project-model/src/state-authority-contract.js";
import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import type { TelemetryEmitter } from "./types.js";

export interface StateMirrorObservation {
  contractId: string;
  authority: {
    surface: StateSurfaceRef;
    value: StateObservedValue;
    revision?: number;
  };
  mirror: {
    surface: StateSurfaceRef;
    value: StateObservedValue;
    revision?: number;
  };
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export function observeStateMirror(
  telemetry: TelemetryEmitter,
  input: StateMirrorObservation,
): boolean {
  const revisionDrift =
    input.authority.revision !== undefined &&
    input.mirror.revision !== undefined &&
    input.mirror.revision !== input.authority.revision;
  const valueDrift = input.authority.value !== input.mirror.value;

  if (!revisionDrift && !valueDrift) return true;

  telemetry.stateDrift({
    contractId: input.contractId,
    authority: input.authority,
    mirror: input.mirror,
    ...(input.scope === undefined ? {} : { scope: input.scope }),
    ...(input.tick === undefined ? {} : { tick: input.tick }),
    ...(input.timestamp === undefined
      ? {}
      : { timestamp: input.timestamp }),
  });
  return false;
}

export interface ReviveObservation {
  targetPlayerKey: string;
  reviverPlayerKey?: string;
  targetLifeGeneration?: number;
  currentLifeGeneration?: number;
  targetDead?: boolean;
  activeReviverCount?: number;
  reviverEligible?: boolean;
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export function observeReviveCompletion(
  telemetry: TelemetryEmitter,
  input: ReviveObservation,
): boolean {
  let anomaly:
    | "self-revive"
    | "multiple-revivers"
    | "stale-revive"
    | "revive-after-death"
    | "invalid-reviver"
    | undefined;

  if (
    input.reviverPlayerKey !== undefined &&
    input.reviverPlayerKey === input.targetPlayerKey
  ) {
    anomaly = "self-revive";
  } else if (
    input.activeReviverCount !== undefined &&
    input.activeReviverCount > 1
  ) {
    anomaly = "multiple-revivers";
  } else if (
    input.targetLifeGeneration !== undefined &&
    input.currentLifeGeneration !== undefined &&
    input.targetLifeGeneration !== input.currentLifeGeneration
  ) {
    anomaly = "stale-revive";
  } else if (input.targetDead === true) {
    anomaly = "revive-after-death";
  } else if (input.reviverEligible === false) {
    anomaly = "invalid-reviver";
  }

  if (!anomaly) return true;

  telemetry.reviveAnomaly({
    anomaly,
    targetPlayerKey: input.targetPlayerKey,
    ...(input.reviverPlayerKey === undefined
      ? {}
      : { reviverPlayerKey: input.reviverPlayerKey }),
    ...(input.scope === undefined ? {} : { scope: input.scope }),
    ...(input.tick === undefined ? {} : { tick: input.tick }),
    ...(input.timestamp === undefined
      ? {}
      : { timestamp: input.timestamp }),
  });
  return false;
}

export interface TeleportFallbackObservation {
  entityKey?: string;
  playerKey?: string;
  routeId?: string;
  reason?: string;
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export function emitTeleportFallback(
  telemetry: TelemetryEmitter,
  input: TeleportFallbackObservation,
): void {
  if (!input.entityKey && !input.playerKey) {
    throw new Error("teleport fallback requires entityKey or playerKey.");
  }

  telemetry.teleportFallback({
    ...(input.entityKey === undefined
      ? {}
      : { entityKey: input.entityKey }),
    ...(input.playerKey === undefined
      ? {}
      : { playerKey: input.playerKey }),
    ...(input.routeId === undefined
      ? {}
      : { routeId: input.routeId }),
    ...(input.reason === undefined ? {} : { reason: input.reason }),
    ...(input.scope === undefined ? {} : { scope: input.scope }),
    ...(input.tick === undefined ? {} : { tick: input.tick }),
    ...(input.timestamp === undefined
      ? {}
      : { timestamp: input.timestamp }),
  });
}
