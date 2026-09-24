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

  return {
    observeStart(input) {
      const key = arenaGenerationKey(
        input.arenaId,
        input.arenaGeneration,
      );
      const current = operations.get(key) ?? new Set<string>();

      if (!current.has(input.operationId) && current.size > 0) {
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
      }

      current.add(input.operationId);
      operations.set(key, current);
    },

    reset(arenaId, arenaGeneration) {
      if (arenaGeneration !== undefined) {
        operations.delete(
          arenaGenerationKey(arenaId, arenaGeneration),
        );
        return;
      }

      for (const key of [...operations.keys()]) {
        if (key.startsWith(arenaId + ":")) operations.delete(key);
      }
    },

    clear() {
      operations.clear();
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
  return {
    check(currentGeneration, overrides = {}) {
      if (currentGeneration === input.capturedGeneration) return true;

      telemetry.staleCallback({
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
      return false;
    },
  };
}
