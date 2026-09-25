import type { RuntimeScope } from "../../project-model/src/index.js";
import {
  createTelemetryEmitter,
  createTelemetryScopeLease,
} from "./emitter.js";
import {
  createBufferedTelemetrySink,
  createFanoutTelemetrySink,
  createValidatingTelemetrySink,
} from "./sink.js";
import { createPriorityBufferedTelemetrySink } from "./priority-buffer.js";
import {
  createTelemetryFlushController,
  type TelemetryBatchTransport,
  type TelemetryFlushController,
} from "./transport.js";
import {
  createProfileTelemetrySink,
  resolveTelemetryRuntimeProfile,
  type TelemetryRuntimeProfile,
  type TelemetryRuntimeProfileName,
} from "./profile.js";
import type {
  TelemetryEmitter,
  TelemetryIdFactory,
  TelemetryScopeLease,
  TelemetrySink,
  BufferedTelemetrySink,
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
  profile?: TelemetryRuntimeProfileName | TelemetryRuntimeProfile;
}

export interface BedrockTelemetryRuntime {
  readonly profile: TelemetryRuntimeProfile;
  telemetry: TelemetryEmitter;
  scope: TelemetryScopeLease;
}

export function createBedrockTelemetryRuntime(
  options: BedrockTelemetryRuntimeOptions,
): BedrockTelemetryRuntime {
  const profile = resolveTelemetryRuntimeProfile(options.profile);
  const scope = createTelemetryScopeLease();

  const telemetry = createTelemetryEmitter({
    producer: "instrumentation",
    sink: createProfileTelemetrySink(options.sink, profile),
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

  return { profile, telemetry, scope };
}


export interface BedrockTelemetryKitOptions {
  system: BedrockSystemClock;
  transport: TelemetryBatchTransport;
  maxEvents?: number;
  bufferStrategy?: "fifo" | "priority";
  sessionId?: string;
  artifactId?: string;
  baseScope?: RuntimeScope;
  scopeProvider?: () => RuntimeScope | undefined;
  streamId?: string;
  idFactory?: TelemetryIdFactory;
  timestampProvider?: () => string | undefined;
  mirrorSink?: TelemetrySink;
  minimumFlushEvents?: number;
  profile?: TelemetryRuntimeProfileName | TelemetryRuntimeProfile;
}

export interface BedrockTelemetryKit extends BedrockTelemetryRuntime {
  buffer: BufferedTelemetrySink;
  flush: TelemetryFlushController;
}

export function createBedrockTelemetryKit(
  options: BedrockTelemetryKitOptions,
): BedrockTelemetryKit {
  const buffer =
    options.bufferStrategy === "priority"
      ? createPriorityBufferedTelemetrySink(options.maxEvents ?? 1000)
      : createBufferedTelemetrySink(options.maxEvents ?? 1000);
  const fanout = options.mirrorSink
    ? createFanoutTelemetrySink([buffer, options.mirrorSink])
    : buffer;
  const sink = createValidatingTelemetrySink(fanout);

  const runtime = createBedrockTelemetryRuntime({
    system: options.system,
    sink,
    ...(options.baseScope === undefined
      ? {}
      : { baseScope: options.baseScope }),
    ...(options.scopeProvider === undefined
      ? {}
      : { scopeProvider: options.scopeProvider }),
    ...(options.streamId === undefined
      ? {}
      : { streamId: options.streamId }),
    ...(options.idFactory === undefined
      ? {}
      : { idFactory: options.idFactory }),
    ...(options.timestampProvider === undefined
      ? {}
      : { timestampProvider: options.timestampProvider }),
    ...(options.profile === undefined
      ? {}
      : { profile: options.profile }),
  });

  const flush = createTelemetryFlushController({
    buffer,
    transport: options.transport,
    ...(options.sessionId === undefined
      ? {}
      : { sessionId: options.sessionId }),
    ...(options.artifactId === undefined
      ? {}
      : { artifactId: options.artifactId }),
    ...(options.minimumFlushEvents === undefined
      ? {}
      : { minimumEvents: options.minimumFlushEvents }),
  });

  return {
    ...runtime,
    buffer,
    flush,
  };
}
