import type { ReviveAnomalyKind } from "../../project-model/src/telemetry.js";
import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import { runtimeScopeKey } from "../../project-model/src/runtime-evidence.js";
import type { TelemetryEmitter } from "./types.js";

export interface ReviveAttemptObservation {
  targetPlayerKey: string;
  reviverPlayerKey: string;
  scope?: RuntimeScope;
  tick?: number;
  timestamp?: string;
}

export interface ReviveCompletionObservation
  extends ReviveAttemptObservation {
  transactionCurrent: boolean;
  targetDeadConfirmed: boolean;
  reviverEligible: boolean;
}

export interface ReviveTelemetryGuard {
  observeAttempt(
    input: ReviveAttemptObservation,
  ): readonly ReviveAnomalyKind[];
  observeCompletion(
    input: ReviveCompletionObservation,
  ): readonly ReviveAnomalyKind[];
  reset(targetPlayerKey?: string): void;
}

function transactionKey(
  input: ReviveAttemptObservation,
): string {
  return input.targetPlayerKey + "|" + runtimeScopeKey(input.scope);
}

function anomalyKey(
  input: ReviveAttemptObservation,
  anomaly: ReviveAnomalyKind,
): string {
  return transactionKey(input) + "|" + anomaly;
}

export function createReviveTelemetryGuard(
  telemetry: TelemetryEmitter,
): ReviveTelemetryGuard {
  const revivers = new Map<string, Set<string>>();
  const reported = new Set<string>();

  const emit = (
    input: ReviveAttemptObservation,
    anomaly: ReviveAnomalyKind,
  ): boolean => {
    const key = anomalyKey(input, anomaly);
    if (reported.has(key)) return false;

    telemetry.reviveAnomaly({
      anomaly,
      targetPlayerKey: input.targetPlayerKey,
      reviverPlayerKey: input.reviverPlayerKey,
      ...(input.scope === undefined ? {} : { scope: input.scope }),
      ...(input.tick === undefined ? {} : { tick: input.tick }),
      ...(input.timestamp === undefined
        ? {}
        : { timestamp: input.timestamp }),
    });
    reported.add(key);
    return true;
  };

  return {
    observeAttempt(input) {
      const emitted: ReviveAnomalyKind[] = [];
      const key = transactionKey(input);
      const active = revivers.get(key) ?? new Set<string>();

      if (
        input.targetPlayerKey === input.reviverPlayerKey &&
        emit(input, "self-revive")
      ) {
        emitted.push("self-revive");
      }

      if (
        !active.has(input.reviverPlayerKey) &&
        active.size > 0 &&
        emit(input, "multiple-revivers")
      ) {
        emitted.push("multiple-revivers");
      }

      active.add(input.reviverPlayerKey);
      revivers.set(key, active);
      return emitted;
    },

    observeCompletion(input) {
      const emitted: ReviveAnomalyKind[] = [];

      if (
        input.targetPlayerKey === input.reviverPlayerKey &&
        emit(input, "self-revive")
      ) {
        emitted.push("self-revive");
      }
      if (
        input.targetDeadConfirmed &&
        emit(input, "revive-after-death")
      ) {
        emitted.push("revive-after-death");
      }
      if (
        !input.transactionCurrent &&
        emit(input, "stale-revive")
      ) {
        emitted.push("stale-revive");
      }
      if (
        !input.reviverEligible &&
        emit(input, "invalid-reviver")
      ) {
        emitted.push("invalid-reviver");
      }

      revivers.delete(transactionKey(input));
      return emitted;
    },

    reset(targetPlayerKey) {
      if (targetPlayerKey === undefined) {
        revivers.clear();
        reported.clear();
        return;
      }

      for (const key of [...revivers.keys()]) {
        if (key.startsWith(targetPlayerKey + "|")) revivers.delete(key);
      }
      for (const key of [...reported]) {
        if (key.startsWith(targetPlayerKey + "|")) reported.delete(key);
      }
    },
  };
}
