import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import type { TelemetryEmitter } from "./types.js";

export interface Position3 {
  x: number;
  y: number;
  z: number;
}

export interface EntityProgressSample {
  entityKey: string;
  tick: number;
  position: Position3;
  expectedToProgress: boolean;
  routeId?: string;
  scope?: RuntimeScope;
}

export interface EntityProgressMonitorOptions {
  telemetry: TelemetryEmitter;
  stallTicks?: number;
  minimumProgressDistance?: number;
}

export interface EntityProgressMonitor {
  observe(sample: EntityProgressSample): boolean;
  reset(entityKey: string, routeId?: string): void;
  clear(): void;
}

interface ProgressState {
  lastProgressTick: number;
  anchor: Position3;
  lastSample: Position3;
  reported: boolean;
}

function keyFor(entityKey: string, routeId?: string): string {
  return entityKey + "|" + (routeId ?? "");
}

function distance(a: Position3, b: Position3): number {
  return Math.hypot(
    b.x - a.x,
    b.y - a.y,
    b.z - a.z,
  );
}

export function createEntityProgressMonitor(
  options: EntityProgressMonitorOptions,
): EntityProgressMonitor {
  const stallTicks = options.stallTicks ?? 40;
  const minimumProgressDistance =
    options.minimumProgressDistance ?? 0.5;

  if (!Number.isInteger(stallTicks) || stallTicks < 1) {
    throw new Error("stallTicks must be a positive integer.");
  }
  if (
    !Number.isFinite(minimumProgressDistance) ||
    minimumProgressDistance <= 0
  ) {
    throw new Error(
      "minimumProgressDistance must be a positive finite number.",
    );
  }

  const state = new Map<string, ProgressState>();

  return {
    observe(sample) {
      const key = keyFor(sample.entityKey, sample.routeId);

      if (!sample.expectedToProgress) {
        state.delete(key);
        return true;
      }

      const current = state.get(key);
      if (!current) {
        state.set(key, {
          lastProgressTick: sample.tick,
          anchor: { ...sample.position },
          lastSample: { ...sample.position },
          reported: false,
        });
        return true;
      }

      if (sample.tick < current.lastProgressTick) {
        state.set(key, {
          lastProgressTick: sample.tick,
          anchor: { ...sample.position },
          lastSample: { ...sample.position },
          reported: false,
        });
        return true;
      }

      const progressDistance = distance(
        current.anchor,
        sample.position,
      );

      if (progressDistance >= minimumProgressDistance) {
        current.anchor = { ...sample.position };
        current.lastSample = { ...sample.position };
        current.lastProgressTick = sample.tick;
        current.reported = false;
        return true;
      }

      const stalledTicks =
        sample.tick - current.lastProgressTick;
      const sampleDelta = distance(
        current.lastSample,
        sample.position,
      );
      current.lastSample = { ...sample.position };

      if (stalledTicks < stallTicks) return true;
      if (current.reported) return false;

      options.telemetry.entityStall({
        entityKey: sample.entityKey,
        ...(sample.routeId === undefined
          ? {}
          : { routeId: sample.routeId }),
        stalledTicks,
        distanceDelta: sampleDelta,
        ...(sample.scope === undefined
          ? {}
          : { scope: sample.scope }),
        tick: sample.tick,
      });
      current.reported = true;
      return false;
    },

    reset(entityKey, routeId) {
      if (routeId !== undefined) {
        state.delete(keyFor(entityKey, routeId));
        return;
      }

      const prefix = entityKey + "|";
      for (const key of [...state.keys()]) {
        if (key.startsWith(prefix)) state.delete(key);
      }
    },

    clear() {
      state.clear();
    },
  };
}
