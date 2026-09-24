import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import type { TelemetryEmitter } from "./types.js";

export interface ArenaStartObservation {
  arenaId: string;
  arenaGeneration: number;
  operationId: string;
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export interface ArenaStartGuard {
  observeStart(input: ArenaStartObservation): void;
  reset(arenaId: string, arenaGeneration?: number): void;
  clear(): void;
}

function arenaGenerationKey(
  arenaId: string,
  arenaGeneration: number,
): string {
  return arenaId + ":" + arenaGeneration;
}

export function createArenaStartGuard(
  telemetry: TelemetryEmitter,
): ArenaStartGuard {
  const operations = new Map<string, Set<string>>();
  const reported = new Set<string>();

  return {
    observeStart(input) {
      const key = arenaGenerationKey(
        input.arenaId,
        input.arenaGeneration,
      );
      const current = operations.get(key) ?? new Set<string>();

      if (
        !current.has(input.operationId) &&
        current.size > 0 &&
        !reported.has(key)
      ) {
        telemetry.arenaDoubleStart({
          arenaId: input.arenaId,
          arenaGeneration: input.arenaGeneration,
          startOperationIds: [...current, input.operationId],
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        });
        reported.add(key);
      }

      current.add(input.operationId);
      operations.set(key, current);
    },

    reset(arenaId, arenaGeneration) {
      if (arenaGeneration !== undefined) {
        const key = arenaGenerationKey(arenaId, arenaGeneration);
        operations.delete(key);
        reported.delete(key);
        return;
      }

      for (const key of [...operations.keys()]) {
        if (key.startsWith(arenaId + ":")) {
          operations.delete(key);
          reported.delete(key);
        }
      }
    },

    clear() {
      operations.clear();
      reported.clear();
    },
  };
}

export interface DeferredGenerationCapture {
  subsystem: string;
  capturedGeneration: number;
  callbackKind?: string;
  scope?: RuntimeScope;
}

export interface DeferredGenerationGuard {
  check(
    currentGeneration: number,
    overrides?: {
      scope?: RuntimeScope;
      tick?: number;
      timestamp?: string;
    },
  ): boolean;
}

export function captureDeferredGeneration(
  telemetry: TelemetryEmitter,
  input: DeferredGenerationCapture,
): DeferredGenerationGuard {
  let reported = false;

  return {
    check(currentGeneration, overrides = {}) {
      if (currentGeneration === input.capturedGeneration) return true;

      if (!reported) telemetry.staleCallback({
        subsystem: input.subsystem,
        capturedGeneration: input.capturedGeneration,
        currentGeneration,
        ...(input.callbackKind === undefined
          ? {}
          : { callbackKind: input.callbackKind }),
        ...(overrides.scope ?? input.scope
          ? { scope: { ...(input.scope ?? {}), ...(overrides.scope ?? {}) } }
          : {}),
        ...(overrides.tick === undefined
          ? {}
          : { tick: overrides.tick }),
        ...(overrides.timestamp === undefined
          ? {}
          : { timestamp: overrides.timestamp }),
      });
      reported = true;
      return false;
    },
  };
}
