import type {
  TelemetryBatch,
} from "../../project-model/src/index.js";
import type { TelemetryFlushController } from "./transport.js";

export interface TelemetryIntervalScheduler {
  runInterval(callback: () => void, intervalTicks: number): number;
  clearRun(handle: number): void;
}

export interface PeriodicTelemetryFlushOptions {
  scheduler: TelemetryIntervalScheduler;
  controller: TelemetryFlushController;
  intervalTicks: number;
  onError?: (error: unknown) => void;
  onFlush?: (batch: TelemetryBatch) => void;
}

export interface PeriodicTelemetryFlush {
  readonly running: boolean;
  start(): boolean;
  stop(options?: { flush?: boolean }): boolean;
  flushNow(): TelemetryBatch | undefined;
}

export function createPeriodicTelemetryFlush(
  options: PeriodicTelemetryFlushOptions,
): PeriodicTelemetryFlush {
  if (
    !Number.isInteger(options.intervalTicks) ||
    options.intervalTicks < 1
  ) {
    throw new Error("intervalTicks must be a positive integer.");
  }

  let handle: number | undefined;

  const flushSafely = (): TelemetryBatch | undefined => {
    try {
      const batch = options.controller.flush();
      if (batch) options.onFlush?.(batch);
      return batch;
    } catch (error) {
      options.onError?.(error);
      return undefined;
    }
  };

  return {
    get running() {
      return handle !== undefined;
    },

    start() {
      if (handle !== undefined) return false;

      handle = options.scheduler.runInterval(
        () => {
          flushSafely();
        },
        options.intervalTicks,
      );
      return true;
    },

    stop(stopOptions = {}) {
      if (handle === undefined) {
        if (stopOptions.flush) flushSafely();
        return false;
      }

      options.scheduler.clearRun(handle);
      handle = undefined;

      if (stopOptions.flush) flushSafely();
      return true;
    },

    flushNow() {
      return flushSafely();
    },
  };
}
