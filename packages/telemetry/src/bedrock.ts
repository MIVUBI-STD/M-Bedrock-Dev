import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import {
  createTelemetryEmitter,
  createTelemetryScopeLease,
} from "./emitter.js";
import type {
  TelemetryEmitter,
  TelemetryIdFactory,
  TelemetryScopeLease,
  TelemetrySink,
} from "./types.js";

export interface BedrockSystemClock {
  readonly currentTick: number;
}

export interface BedrockTelemetryRuntimeOptions {
  system: BedrockSystemClock;
  sink: TelemetrySink;
  baseScope?: RuntimeScope;
  scopeProvider?: () => RuntimeScope | undefined;
  streamId?: string;
  idFactory?: TelemetryIdFactory;
  timestampProvider?: () => string | undefined;
}

export interface BedrockTelemetryRuntime {
  telemetry: TelemetryEmitter;
  scope: TelemetryScopeLease;
}

export function createBedrockTelemetryRuntime(
  options: BedrockTelemetryRuntimeOptions,
): BedrockTelemetryRuntime {
  const scope = createTelemetryScopeLease();

  const telemetry = createTelemetryEmitter({
    producer: "instrumentation",
    sink: options.sink,
    ...(options.baseScope === undefined
      ? {}
      : { baseScope: options.baseScope }),
    scopeProvider: () => ({
      ...scope.current(),
      ...(options.scopeProvider?.() ?? {}),
    }),
    tickProvider: () => options.system.currentTick,
    ...(options.timestampProvider === undefined
      ? {}
      : { timestampProvider: options.timestampProvider }),
    ...(options.streamId === undefined
      ? {}
      : { streamId: options.streamId }),
    ...(options.idFactory === undefined
      ? {}
      : { idFactory: options.idFactory }),
  });

  return { telemetry, scope };
}
