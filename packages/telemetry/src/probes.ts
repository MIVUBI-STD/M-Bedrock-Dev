import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import { runtimeScopeKey } from "../../project-model/src/runtime-evidence.js";
import type {
  StateObservedValue,
  StateSurfaceRef,
} from "../../project-model/src/state-authority-contract.js";
import type { TelemetryEmitter } from "./types.js";

export interface Vector3Sample {
  x: number;
  y: number;
  z: number;
}

export interface EntityProgressSample {
  entityKey: string;
  tick: number;
  position: Vector3Sample;
  expectedToProgress: boolean;
  routeId?: string;
  scope?: RuntimeScope;
}

export interface EntityProgressProbeOptions {
  stallTicks: number;
  minProgressDistance?: number;
}

export type EntityProgressStatus =
  | "initialized"
  | "paused"
  | "waiting"
  | "progressed"
  | "stalled";

export interface EntityProgressProbe {
  observe(sample: EntityProgressSample): EntityProgressStatus;
  forget(entityKey: string, routeId?: string): void;
  clear(): void;
}

interface EntityProgressState {
  anchor: Vector3Sample;
  lastProgressTick: number;
  lastSampleTick: number;
  reported: boolean;
}

function distance(
  a: Vector3Sample,
  b: Vector3Sample,
): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function progressKey(sample: EntityProgressSample): string {
  return [
    sample.entityKey,
    sample.routeId ?? "",
    runtimeScopeKey(sample.scope),
  ].join("|");
}

export function createEntityProgressProbe(
  telemetry: TelemetryEmitter,
  options: EntityProgressProbeOptions,
): EntityProgressProbe {
  if (!Number.isInteger(options.stallTicks) || options.stallTicks < 1) {
    throw new Error("stallTicks must be a positive integer.");
  }
  const minProgressDistance = options.minProgressDistance ?? 0.25;
  if (!Number.isFinite(minProgressDistance) || minProgressDistance < 0) {
    throw new Error("minProgressDistance must be a non-negative number.");
  }

  const states = new Map<string, EntityProgressState>();

  return {
    observe(sample) {
      if (!Number.isInteger(sample.tick) || sample.tick < 0) {
        throw new Error("Entity progress sample tick must be a non-negative integer.");
      }
      for (const value of [
        sample.position.x,
        sample.position.y,
        sample.position.z,
      ]) {
        if (!Number.isFinite(value)) {
          throw new Error("Entity progress sample position must be finite.");
        }
      }

      const key = progressKey(sample);
      const current = states.get(key);

      if (!sample.expectedToProgress) {
        states.set(key, {
          anchor: { ...sample.position },
          lastProgressTick: sample.tick,
          lastSampleTick: sample.tick,
          reported: false,
        });
        return "paused";
      }

      if (!current || sample.tick < current.lastSampleTick) {
        states.set(key, {
          anchor: { ...sample.position },
          lastProgressTick: sample.tick,
          lastSampleTick: sample.tick,
          reported: false,
        });
        return "initialized";
      }

      const delta = distance(current.anchor, sample.position);
      if (delta >= minProgressDistance) {
        current.anchor = { ...sample.position };
        current.lastProgressTick = sample.tick;
        current.lastSampleTick = sample.tick;
        current.reported = false;
        return "progressed";
      }

      current.lastSampleTick = sample.tick;
      const stalledTicks = sample.tick - current.lastProgressTick;

      if (stalledTicks >= options.stallTicks) {
        if (!current.reported) {
          telemetry.entityStall({
            entityKey: sample.entityKey,
            ...(sample.routeId === undefined
              ? {}
              : { routeId: sample.routeId }),
            stalledTicks,
            distanceDelta: delta,
            ...(sample.scope === undefined
              ? {}
              : { scope: sample.scope }),
            tick: sample.tick,
          });
          current.reported = true;
        }
        return "stalled";
      }

      return "waiting";
    },

    forget(entityKey, routeId) {
      for (const key of [...states.keys()]) {
        const [keyEntity, keyRoute] = key.split("|", 2);
        if (
          keyEntity === entityKey &&
          (routeId === undefined || keyRoute === routeId)
        ) {
          states.delete(key);
        }
      }
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

export type StateMirrorProbeStatus =
  | "consistent"
  | "value-drift"
  | "revision-stale";

export interface StateMirrorProbe {
  observe(sample: StateMirrorSample): StateMirrorProbeStatus;
  reset(contractId?: string): void;
}

function mirrorKey(sample: StateMirrorSample): string {
  return sample.contractId + "|" + runtimeScopeKey(sample.scope);
}

function driftStatus(
  sample: StateMirrorSample,
): StateMirrorProbeStatus {
  if (
    sample.authority.revision !== undefined &&
    sample.mirror.revision !== undefined &&
    sample.mirror.revision < sample.authority.revision
  ) {
    return "revision-stale";
  }
  return sample.authority.value === sample.mirror.value
    ? "consistent"
    : "value-drift";
}

function driftSignature(sample: StateMirrorSample): string {
  return JSON.stringify([
    sample.authority.value,
    sample.authority.revision ?? null,
    sample.mirror.value,
    sample.mirror.revision ?? null,
  ]);
}

export function createStateMirrorProbe(
  telemetry: TelemetryEmitter,
): StateMirrorProbe {
  const reported = new Map<string, string>();

  return {
    observe(sample) {
      const status = driftStatus(sample);
      const key = mirrorKey(sample);

      if (status === "consistent") {
        reported.delete(key);
        return status;
      }

      const signature = driftSignature(sample);
      if (reported.get(key) !== signature) {
        telemetry.stateDrift({
          contractId: sample.contractId,
          authority: sample.authority,
          mirror: sample.mirror,
          ...(sample.scope === undefined
            ? {}
            : { scope: sample.scope }),
          ...(sample.tick === undefined
            ? {}
            : { tick: sample.tick }),
          ...(sample.timestamp === undefined
            ? {}
            : { timestamp: sample.timestamp }),
          note: status,
        });
        reported.set(key, signature);
      }

      return status;
    },

    reset(contractId) {
      if (contractId === undefined) {
        reported.clear();
        return;
      }
      for (const key of [...reported.keys()]) {
        if (key.startsWith(contractId + "|")) reported.delete(key);
      }
    },
  };
}
