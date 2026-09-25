import type { TelemetryEvent } from "../../project-model/src/index.js";
import type { TelemetrySink } from "./types.js";

export interface TelemetryBudgetStats {
  emitted: number;
  dropped: number;
  droppedByKind: Readonly<Record<string, number>>;
}

export interface TelemetryBudgetOptions {
  maxEventsPerTick: number;
  maxEventsWithoutTick?: number;
  onDrop?: (event: TelemetryEvent, reason: string) => void;
}

export interface BudgetedTelemetrySink extends TelemetrySink {
  stats(): TelemetryBudgetStats;
  resetStats(): void;
}

export function createTickBudgetedTelemetrySink(
  sink: TelemetrySink,
  options: TelemetryBudgetOptions,
): BudgetedTelemetrySink {
  if (
    !Number.isInteger(options.maxEventsPerTick) ||
    options.maxEventsPerTick < 1
  ) {
    throw new Error("maxEventsPerTick must be a positive integer.");
  }

  const maxEventsWithoutTick = options.maxEventsWithoutTick ?? 100;
  if (
    !Number.isInteger(maxEventsWithoutTick) ||
    maxEventsWithoutTick < 1
  ) {
    throw new Error("maxEventsWithoutTick must be a positive integer.");
  }

  let currentTick: number | undefined;
  let currentTickCount = 0;
  let untickedCount = 0;
  let emitted = 0;
  let dropped = 0;
  const droppedByKind: Record<string, number> = {};

  const drop = (event: TelemetryEvent, reason: string): void => {
    dropped += 1;
    droppedByKind[event.kind] =
      (droppedByKind[event.kind] ?? 0) + 1;
    options.onDrop?.(event, reason);
  };

  return {
    emit(event) {
      if (event.tick === undefined) {
        if (untickedCount >= maxEventsWithoutTick) {
          drop(event, "unticked-budget-exceeded");
          return;
        }
        untickedCount += 1;
        emitted += 1;
        sink.emit(event);
        return;
      }

      if (currentTick !== event.tick) {
        currentTick = event.tick;
        currentTickCount = 0;
      }

      if (currentTickCount >= options.maxEventsPerTick) {
        drop(event, "tick-budget-exceeded");
        return;
      }

      currentTickCount += 1;
      emitted += 1;
      sink.emit(event);
    },

    stats() {
      return {
        emitted,
        dropped,
        droppedByKind: { ...droppedByKind },
      };
    },

    resetStats() {
      emitted = 0;
      dropped = 0;
      untickedCount = 0;
      currentTick = undefined;
      currentTickCount = 0;
      for (const key of Object.keys(droppedByKind)) {
        delete droppedByKind[key];
      }
    },
  };
}

export interface SamplingTelemetrySinkOptions {
  every: number;
  key?: (event: TelemetryEvent) => string;
}

export function createSamplingTelemetrySink(
  sink: TelemetrySink,
  options: SamplingTelemetrySinkOptions,
): TelemetrySink {
  if (!Number.isInteger(options.every) || options.every < 1) {
    throw new Error("sampling every must be a positive integer.");
  }

  const counters = new Map<string, number>();
  const keyFor = options.key ?? ((event: TelemetryEvent) => event.kind);

  return {
    emit(event) {
      const key = keyFor(event);
      const count = (counters.get(key) ?? 0) + 1;
      counters.set(key, count);
      if ((count - 1) % options.every === 0) {
        sink.emit(event);
      }
    },
  };
}
