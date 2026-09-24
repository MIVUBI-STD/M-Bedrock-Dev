import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import type { StateObservedValue, StateSurfaceRef } from "../../project-model/src/state-authority-contract.js";
import type { TelemetryEmitter } from "./types.js";

export interface PositionSample {
  x: number;
  y: number;
  z: number;
}

export interface EntityProgressSample {
  entityKey: string;
  position: PositionSample;
  scope?: RuntimeScope;
  routeId?: string;
  eligible?: boolean;
  expectedToProgress?: boolean;
  tick?: number;
  timestamp?: string;
}

export interface EntityProgressMonitorOptions {
  telemetry: TelemetryEmitter;
  stallTicks: number;
  minimumProgressDistance?: number;
  repeatCooldownTicks?: number;
}

export interface EntityProgressMonitor {
  observe(sample: EntityProgressSample): boolean;
  reset(entityKey: string): void;
  clear(): void;
}

interface EntityProgressState {
  anchor: PositionSample;
  anchorTick: number;
  lastTick: number;
  lastReportedTick?: number;
}

function distance(a: PositionSample, b: PositionSample): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function createEntityProgressMonitor(
  options: EntityProgressMonitorOptions,
): EntityProgressMonitor {
  if (!Number.isInteger(options.stallTicks) || options.stallTicks < 1) {
    throw new Error("stallTicks must be a positive integer.");
  }

  const minimumProgressDistance = options.minimumProgressDistance ?? 0.5;
  const repeatCooldownTicks =
    options.repeatCooldownTicks ?? options.stallTicks;
  const states = new Map<string, EntityProgressState>();

  return {
    observe(sample) {
      const expectedToProgress =
        sample.expectedToProgress ?? sample.eligible ?? true;
      if (!expectedToProgress) {
        states.delete(sample.entityKey);
        return true;
      }

      const tick = sample.tick;
      if (tick === undefined || !Number.isInteger(tick) || tick < 0) {
        return true;
      }

      const current = states.get(sample.entityKey);
      if (!current || tick < current.lastTick) {
        states.set(sample.entityKey, {
          anchor: sample.position,
          anchorTick: tick,
          lastTick: tick,
        });
        return true;
      }

      const delta = distance(current.anchor, sample.position);
      if (delta >= minimumProgressDistance) {
        states.set(sample.entityKey, {
          anchor: sample.position,
          anchorTick: tick,
          lastTick: tick,
          ...(current.lastReportedTick === undefined
            ? {}
            : { lastReportedTick: current.lastReportedTick }),
        });
        return true;
      }

      current.lastTick = tick;
      const stalledTicks = tick - current.anchorTick;
      if (stalledTicks < options.stallTicks) return true;

      if (
        current.lastReportedTick !== undefined &&
        tick - current.lastReportedTick < repeatCooldownTicks
      ) {
        return false;
      }

      options.telemetry.entityStall({
        entityKey: sample.entityKey,
        ...(sample.routeId === undefined ? {} : { routeId: sample.routeId }),
        stalledTicks,
        distanceDelta: delta,
        ...(sample.scope === undefined ? {} : { scope: sample.scope }),
        tick,
        ...(sample.timestamp === undefined
          ? {}
          : { timestamp: sample.timestamp }),
      });
      current.lastReportedTick = tick;
      return false;
    },

    reset(entityKey) {
      states.delete(entityKey);
    },

    clear() {
      states.clear();
    },
  };
}

export interface StateMirrorSample {
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

export interface StateMirrorMonitor {
  observe(sample: StateMirrorSample): boolean;
  reset(contractId?: string): void;
}

function driftKey(sample: StateMirrorSample): string {
  return [
    sample.contractId,
    JSON.stringify(sample.authority.surface),
    JSON.stringify(sample.mirror.surface),
    String(sample.authority.value),
    String(sample.mirror.value),
    String(sample.authority.revision ?? ""),
    String(sample.mirror.revision ?? ""),
  ].join("|");
}

function sampleDrifts(sample: StateMirrorSample): boolean {
  if (sample.authority.value !== sample.mirror.value) return true;
  if (
    sample.authority.revision !== undefined &&
    sample.mirror.revision !== undefined &&
    sample.mirror.revision < sample.authority.revision
  ) {
    return true;
  }
  return false;
}

export function createStateMirrorMonitor(
  telemetry: TelemetryEmitter,
): StateMirrorMonitor {
  const reported = new Map<string, string>();

  return {
    observe(sample) {
      const isDrift = sampleDrifts(sample);
      if (!isDrift) {
        reported.delete(sample.contractId);
        return false;
      }

      const key = driftKey(sample);
      if (reported.get(sample.contractId) === key) return true;

      telemetry.stateDrift({
        contractId: sample.contractId,
        authority: sample.authority,
        mirror: sample.mirror,
        ...(sample.scope === undefined ? {} : { scope: sample.scope }),
        ...(sample.tick === undefined ? {} : { tick: sample.tick }),
        ...(sample.timestamp === undefined
          ? {}
          : { timestamp: sample.timestamp }),
      });
      reported.set(sample.contractId, key);
      return true;
    },

    reset(contractId) {
      if (contractId === undefined) {
        reported.clear();
      } else {
        reported.delete(contractId);
      }
    },
  };
}
