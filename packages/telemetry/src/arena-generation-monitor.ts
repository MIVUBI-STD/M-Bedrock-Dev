import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import type {
  ArenaGenerationAnomalyKind,
} from "../../project-model/src/telemetry.js";
import type { TelemetryEmitter } from "./types.js";

export interface ArenaGenerationStartObservation {
  arenaId: string;
  arenaGeneration: number;
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export interface ArenaGenerationResetObservation {
  arenaId: string;
  arenaGeneration: number;
}

export interface ArenaGenerationTerminalObservation {
  arenaId: string;
  arenaGeneration: number;
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export interface ArenaGenerationMonitor {
  observeStart(input: ArenaGenerationStartObservation):
    readonly ArenaGenerationAnomalyKind[];
  observeResetVerified(input: ArenaGenerationResetObservation): void;
  observeTerminal(input: ArenaGenerationTerminalObservation):
    readonly ArenaGenerationAnomalyKind[];
  reset(arenaId?: string): void;
}

interface ArenaGenerationState {
  currentGeneration?: number;
  activeGenerations: Set<number>;
  resetVerified: Set<number>;
  reported: Set<string>;
}

function stateFor(
  states: Map<string, ArenaGenerationState>,
  arenaId: string,
): ArenaGenerationState {
  const existing = states.get(arenaId);
  if (existing) return existing;
  const created: ArenaGenerationState = {
    activeGenerations: new Set(),
    resetVerified: new Set(),
    reported: new Set(),
  };
  states.set(arenaId, created);
  return created;
}

function reportKey(
  anomaly: ArenaGenerationAnomalyKind,
  observedGeneration: number,
  priorGeneration?: number,
): string {
  return [
    anomaly,
    observedGeneration,
    priorGeneration ?? "",
  ].join(":");
}

function emitOnce(
  telemetry: TelemetryEmitter,
  state: ArenaGenerationState,
  input: {
    anomaly: ArenaGenerationAnomalyKind;
    arenaId: string;
    observedGeneration: number;
    currentGeneration?: number;
    priorGeneration?: number;
    scope?: RuntimeScope;
    tick?: number;
    timestamp?: string;
  },
): boolean {
  const key = reportKey(
    input.anomaly,
    input.observedGeneration,
    input.priorGeneration,
  );
  if (state.reported.has(key)) return false;

  telemetry.arenaGenerationAnomaly({
    anomaly: input.anomaly,
    arenaId: input.arenaId,
    observedGeneration: input.observedGeneration,
    ...(input.currentGeneration === undefined
      ? {}
      : { currentGeneration: input.currentGeneration }),
    ...(input.priorGeneration === undefined
      ? {}
      : { priorGeneration: input.priorGeneration }),
    ...(input.scope === undefined ? {} : { scope: input.scope }),
    ...(input.tick === undefined ? {} : { tick: input.tick }),
    ...(input.timestamp === undefined
      ? {}
      : { timestamp: input.timestamp }),
  });
  state.reported.add(key);
  return true;
}

export function createArenaGenerationMonitor(
  telemetry: TelemetryEmitter,
): ArenaGenerationMonitor {
  const states = new Map<string, ArenaGenerationState>();

  return {
    observeStart(input) {
      const state = stateFor(states, input.arenaId);
      const anomalies: ArenaGenerationAnomalyKind[] = [];
      const current = state.currentGeneration;

      if (current === undefined) {
        state.currentGeneration = input.arenaGeneration;
        state.activeGenerations.add(input.arenaGeneration);
        return anomalies;
      }

      if (input.arenaGeneration < current) {
        if (emitOnce(telemetry, state, {
          anomaly: "generation-regression",
          arenaId: input.arenaId,
          observedGeneration: input.arenaGeneration,
          currentGeneration: current,
          priorGeneration: current,
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        })) {
          anomalies.push("generation-regression");
        }
        return anomalies;
      }

      if (input.arenaGeneration === current) {
        state.activeGenerations.add(input.arenaGeneration);
        return anomalies;
      }

      const priorGeneration = current;
      const priorStillActive =
        state.activeGenerations.has(priorGeneration);
      const priorResetVerified =
        state.resetVerified.has(priorGeneration);

      if (priorStillActive && !priorResetVerified) {
        if (emitOnce(telemetry, state, {
          anomaly: "reuse-before-reset",
          arenaId: input.arenaId,
          observedGeneration: input.arenaGeneration,
          currentGeneration: input.arenaGeneration,
          priorGeneration,
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        })) {
          anomalies.push("reuse-before-reset");
        }
      }


      state.currentGeneration = input.arenaGeneration;
      state.activeGenerations.add(input.arenaGeneration);
      return anomalies;
    },

    observeResetVerified(input) {
      const state = stateFor(states, input.arenaId);
      state.resetVerified.add(input.arenaGeneration);
      state.activeGenerations.delete(input.arenaGeneration);
    },

    observeTerminal(input) {
      const state = stateFor(states, input.arenaId);
      const anomalies: ArenaGenerationAnomalyKind[] = [];
      const current = state.currentGeneration;

      if (
        current !== undefined &&
        input.arenaGeneration < current
      ) {
        if (emitOnce(telemetry, state, {
          anomaly: "stale-terminal",
          arenaId: input.arenaId,
          observedGeneration: input.arenaGeneration,
          currentGeneration: current,
          priorGeneration: input.arenaGeneration,
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        })) {
          anomalies.push("stale-terminal");
        }
      }
      return anomalies;
    },

    reset(arenaId) {
      if (arenaId === undefined) {
        states.clear();
      } else {
        states.delete(arenaId);
      }
    },
  };
}
