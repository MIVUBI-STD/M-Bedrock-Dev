import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import type { TelemetryEmitter } from "./types.js";

export interface ReviveStartObservation {
  targetPlayerKey: string;
  targetLifeGeneration: number;
  reviverPlayerKey: string;
  eligible: boolean;
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export interface ReviveCompletionObservation {
  targetPlayerKey: string;
  targetLifeGeneration: number;
  reviverPlayerKey?: string;
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export interface ReviveDeathObservation {
  targetPlayerKey: string;
  targetLifeGeneration: number;
}

export interface ReviveGenerationObservation {
  targetPlayerKey: string;
  currentLifeGeneration: number;
}

export interface ReviveTransactionMonitor {
  observeStart(input: ReviveStartObservation): void;
  observeCompletion(input: ReviveCompletionObservation): void;
  observeDeath(input: ReviveDeathObservation): void;
  observeGeneration(input: ReviveGenerationObservation): void;
  reset(targetPlayerKey: string): void;
  clear(): void;
}

interface ReviveState {
  currentLifeGeneration?: number;
  ownerByLife: Map<number, string>;
  deadLives: Set<number>;
  reported: Set<string>;
}

function anomalyKey(
  anomaly: string,
  lifeGeneration: number,
  reviverPlayerKey?: string,
): string {
  return [
    anomaly,
    lifeGeneration,
    reviverPlayerKey ?? "",
  ].join(":");
}

function stateFor(
  states: Map<string, ReviveState>,
  targetPlayerKey: string,
): ReviveState {
  const existing = states.get(targetPlayerKey);
  if (existing) return existing;
  const created: ReviveState = {
    ownerByLife: new Map(),
    deadLives: new Set(),
    reported: new Set(),
  };
  states.set(targetPlayerKey, created);
  return created;
}

function emitOnce(
  telemetry: TelemetryEmitter,
  state: ReviveState,
  input: {
    anomaly:
      | "self-revive"
      | "multiple-revivers"
      | "stale-revive"
      | "revive-after-death"
      | "invalid-reviver";
    targetPlayerKey: string;
    lifeGeneration: number;
    reviverPlayerKey?: string;
    scope?: RuntimeScope;
    tick?: number;
    timestamp?: string;
  },
): void {
  const key = anomalyKey(
    input.anomaly,
    input.lifeGeneration,
    input.reviverPlayerKey,
  );
  if (state.reported.has(key)) return;

  telemetry.reviveAnomaly({
    anomaly: input.anomaly,
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
  state.reported.add(key);
}

export function createReviveTransactionMonitor(
  telemetry: TelemetryEmitter,
): ReviveTransactionMonitor {
  const states = new Map<string, ReviveState>();

  return {
    observeGeneration(input) {
      const state = stateFor(states, input.targetPlayerKey);
      state.currentLifeGeneration = input.currentLifeGeneration;
    },

    observeStart(input) {
      const state = stateFor(states, input.targetPlayerKey);
      if (state.currentLifeGeneration === undefined) {
        state.currentLifeGeneration = input.targetLifeGeneration;
      }

      if (input.reviverPlayerKey === input.targetPlayerKey) {
        emitOnce(telemetry, state, {
          anomaly: "self-revive",
          targetPlayerKey: input.targetPlayerKey,
          lifeGeneration: input.targetLifeGeneration,
          ...(input.reviverPlayerKey === undefined
            ? {}
            : { reviverPlayerKey: input.reviverPlayerKey }),
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        });
      }

      if (!input.eligible) {
        emitOnce(telemetry, state, {
          anomaly: "invalid-reviver",
          targetPlayerKey: input.targetPlayerKey,
          lifeGeneration: input.targetLifeGeneration,
          ...(input.reviverPlayerKey === undefined
            ? {}
            : { reviverPlayerKey: input.reviverPlayerKey }),
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        });
      }

      if (
        state.currentLifeGeneration !== undefined &&
        input.targetLifeGeneration !== state.currentLifeGeneration
      ) {
        emitOnce(telemetry, state, {
          anomaly: "stale-revive",
          targetPlayerKey: input.targetPlayerKey,
          lifeGeneration: input.targetLifeGeneration,
          ...(input.reviverPlayerKey === undefined
            ? {}
            : { reviverPlayerKey: input.reviverPlayerKey }),
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        });
      }

      const owner = state.ownerByLife.get(input.targetLifeGeneration);
      if (
        owner !== undefined &&
        owner !== input.reviverPlayerKey
      ) {
        emitOnce(telemetry, state, {
          anomaly: "multiple-revivers",
          targetPlayerKey: input.targetPlayerKey,
          lifeGeneration: input.targetLifeGeneration,
          ...(input.reviverPlayerKey === undefined
            ? {}
            : { reviverPlayerKey: input.reviverPlayerKey }),
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        });
      } else if (owner === undefined) {
        state.ownerByLife.set(
          input.targetLifeGeneration,
          input.reviverPlayerKey,
        );
      }
    },

    observeCompletion(input) {
      const state = stateFor(states, input.targetPlayerKey);

      if (
        state.currentLifeGeneration !== undefined &&
        input.targetLifeGeneration !== state.currentLifeGeneration
      ) {
        emitOnce(telemetry, state, {
          anomaly: "stale-revive",
          targetPlayerKey: input.targetPlayerKey,
          lifeGeneration: input.targetLifeGeneration,
          ...(input.reviverPlayerKey === undefined
            ? {}
            : { reviverPlayerKey: input.reviverPlayerKey }),
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        });
      }

      if (state.deadLives.has(input.targetLifeGeneration)) {
        emitOnce(telemetry, state, {
          anomaly: "revive-after-death",
          targetPlayerKey: input.targetPlayerKey,
          lifeGeneration: input.targetLifeGeneration,
          ...(input.reviverPlayerKey === undefined
            ? {}
            : { reviverPlayerKey: input.reviverPlayerKey }),
          ...(input.scope === undefined ? {} : { scope: input.scope }),
          ...(input.tick === undefined ? {} : { tick: input.tick }),
          ...(input.timestamp === undefined
            ? {}
            : { timestamp: input.timestamp }),
        });
      }
    },

    observeDeath(input) {
      const state = stateFor(states, input.targetPlayerKey);
      state.deadLives.add(input.targetLifeGeneration);
      state.ownerByLife.delete(input.targetLifeGeneration);
    },

    reset(targetPlayerKey) {
      states.delete(targetPlayerKey);
    },

    clear() {
      states.clear();
    },
  };
}
