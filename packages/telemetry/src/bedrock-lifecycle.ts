import type { TelemetryBatch } from "../../project-model/src/index.js";
import {
  createBedrockScriptEventTelemetryCollector,
  type BedrockScriptEventSignalLike,
} from "./bedrock-bridge.js";
import {
  createTelemetryInstrumentationKit,
  type TelemetryInstrumentationKit,
  type TelemetryInstrumentationKitOptions,
} from "./kit.js";
import {
  createPeriodicTelemetryFlush,
  type PeriodicTelemetryFlush,
  type TelemetryIntervalScheduler,
} from "./scheduler.js";
import {
  createValidatingTelemetrySink,
} from "./sink.js";
import { createProfileTelemetrySink } from "./profile.js";
import type { TelemetryBatchTransport } from "./transport.js";

export interface BedrockTelemetryLifecycleSystem
  extends TelemetryIntervalScheduler {
  readonly currentTick: number;
  afterEvents?: {
    scriptEventReceive?: BedrockScriptEventSignalLike;
  };
}

export interface BedrockTelemetryLifecycleHostOptions
  extends Omit<
    TelemetryInstrumentationKitOptions,
    "tickProvider" | "transportSink"
  > {
  system: BedrockTelemetryLifecycleSystem;
  transport: TelemetryBatchTransport;
  flushIntervalTicks?: number;
  minimumFlushEvents?: number;
  scriptEventId?: string;
  receiveScriptEvents?: boolean;
  acceptScriptEvent?: Parameters<
    typeof createBedrockScriptEventTelemetryCollector
  >[0]["accept"];
  onInvalidScriptEvent?: Parameters<
    typeof createBedrockScriptEventTelemetryCollector
  >[0]["onInvalid"];
  onFlush?: (batch: TelemetryBatch) => void;
  onFlushError?: (error: unknown) => void;
}

export interface BedrockTelemetryLifecycleHost {
  readonly kit: TelemetryInstrumentationKit;
  readonly running: boolean;
  start(): boolean;
  stop(options?: { flush?: boolean }): boolean;
  flushNow(): TelemetryBatch | undefined;
  resetRuntimeState(): void;
  dispose(options?: { flush?: boolean }): void;
}

export function createBedrockTelemetryLifecycleHost(
  options: BedrockTelemetryLifecycleHostOptions,
): BedrockTelemetryLifecycleHost {
  const kit = createTelemetryInstrumentationKit({
    ...options,
    tickProvider: () => options.system.currentTick,
  });

  const flushController = {
    get pending() {
      return kit.buffer.size;
    },
    flush(): TelemetryBatch | undefined {
      if (
        options.minimumFlushEvents !== undefined &&
        kit.buffer.size < options.minimumFlushEvents
      ) {
        return undefined;
      }

      const batch = kit.batch();
      if (batch.events.length === 0) return undefined;

      options.transport.send(batch);
      kit.clearBuffer();
      return batch;
    },
  };

  const periodic: PeriodicTelemetryFlush | undefined =
    options.flushIntervalTicks === undefined ||
    kit.profile.name === "off"
      ? undefined
      : createPeriodicTelemetryFlush({
          scheduler: options.system,
          controller: flushController,
          intervalTicks: options.flushIntervalTicks,
          ...(options.onFlush === undefined
            ? {}
            : { onFlush: options.onFlush }),
          ...(options.onFlushError === undefined
            ? {}
            : { onError: options.onFlushError }),
        });

  let collector:
    | ReturnType<typeof createBedrockScriptEventTelemetryCollector>
    | undefined;
  let running = false;
  let disposed = false;

  const startCollector = (): void => {
    if (
      kit.profile.name === "off" ||
      options.receiveScriptEvents === false ||
      collector !== undefined
    ) {
      return;
    }

    const signal = options.system.afterEvents?.scriptEventReceive;
    if (!signal) return;

    collector = createBedrockScriptEventTelemetryCollector({
      signal,
      sink: createProfileTelemetrySink(
        createValidatingTelemetrySink(kit.buffer),
        kit.profile,
      ),
      ...(options.scriptEventId === undefined
        ? {}
        : { eventId: options.scriptEventId }),
      ...(options.acceptScriptEvent === undefined
        ? {}
        : { accept: options.acceptScriptEvent }),
      ...(options.onInvalidScriptEvent === undefined
        ? {}
        : { onInvalid: options.onInvalidScriptEvent }),
    });
  };

  const stopCollector = (): void => {
    collector?.dispose();
    collector = undefined;
  };

  const flushNow = (): TelemetryBatch | undefined => {
    if (periodic) return periodic.flushNow();
    try {
      const batch = flushController.flush();
      if (batch) options.onFlush?.(batch);
      return batch;
    } catch (error) {
      options.onFlushError?.(error);
      if (!options.onFlushError) throw error;
      return undefined;
    }
  };

  return {
    kit,

    get running() {
      return running;
    },

    start() {
      if (disposed) {
        throw new Error(
          "Cannot start a disposed Bedrock telemetry lifecycle host.",
        );
      }
      if (running) return false;

      startCollector();
      periodic?.start();
      running = true;
      return true;
    },

    stop(stopOptions = {}) {
      if (!running) {
        if (stopOptions.flush) flushNow();
        return false;
      }

      periodic?.stop();
      stopCollector();
      running = false;
      if (stopOptions.flush) flushNow();
      return true;
    },

    flushNow,

    resetRuntimeState() {
      kit.resetRuntimeState();
    },

    dispose(disposeOptions = {}) {
      if (disposed) return;
      if (running) {
        this.stop({
          ...(disposeOptions.flush === undefined
            ? {}
            : { flush: disposeOptions.flush }),
        });
      } else if (disposeOptions.flush) {
        flushNow();
      }
      stopCollector();
      periodic?.stop();
      disposed = true;
    },
  };
}
