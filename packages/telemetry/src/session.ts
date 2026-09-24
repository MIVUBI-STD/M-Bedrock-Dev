import type {
  TelemetryBatch,
  TelemetryProducer,
} from "../../project-model/src/telemetry.js";
import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import {
  captureDeferredGeneration,
  createArenaStartGuard,
  type ArenaStartGuard,
  type DeferredGenerationCapture,
  type DeferredGenerationGuard,
} from "./guards.js";
import {
  createEntityProgressProbe,
  createStateMirrorProbe,
  type EntityProgressProbe,
  type EntityProgressProbeOptions,
  type StateMirrorProbe,
} from "./probes.js";
import {
  createReviveTelemetryGuard,
  type ReviveTelemetryGuard,
} from "./revive-guard.js";
import {
  createTelemetryEmitter,
  createTelemetryScopeLease,
} from "./emitter.js";
import {
  createBufferedTelemetrySink,
  createFanoutTelemetrySink,
  createValidatingTelemetrySink,
} from "./sink.js";
import type {
  BufferedTelemetrySink,
  TelemetryEmitter,
  TelemetryIdFactory,
  TelemetryScopeLease,
  TelemetrySink,
} from "./types.js";

export interface TelemetrySessionOptions {
  producer: TelemetryProducer;
  sessionId?: string;
  artifactId?: string;
  maxEvents?: number;
  baseScope?: RuntimeScope;
  initialScope?: RuntimeScope;
  tickProvider?: () => number | undefined;
  timestampProvider?: () => string | undefined;
  idFactory?: TelemetryIdFactory;
  transportSink?: TelemetrySink;
  validateEvents?: boolean;
}

export interface TelemetrySession {
  telemetry: TelemetryEmitter;
  scope: TelemetryScopeLease;
  buffer: BufferedTelemetrySink;
  arenaStart: ArenaStartGuard;
  revive: ReviveTelemetryGuard;
  stateMirror: StateMirrorProbe;
  captureDeferredGeneration(
    input: DeferredGenerationCapture,
  ): DeferredGenerationGuard;
  createEntityProgressProbe(
    options: EntityProgressProbeOptions,
  ): EntityProgressProbe;
  batch(): TelemetryBatch;
  reset(): void;
}

export function createTelemetrySession(
  options: TelemetrySessionOptions,
): TelemetrySession {
  const buffer = createBufferedTelemetrySink(options.maxEvents ?? 1000);
  const rawSink = options.transportSink
    ? createFanoutTelemetrySink([buffer, options.transportSink])
    : buffer;
  const sink = options.validateEvents === false
    ? rawSink
    : createValidatingTelemetrySink(rawSink);

  const scope = createTelemetryScopeLease(options.initialScope ?? {});
  const telemetry = createTelemetryEmitter({
    producer: options.producer,
    sink,
    ...(options.baseScope === undefined
      ? {}
      : { baseScope: options.baseScope }),
    scopeProvider: () => scope.current(),
    ...(options.tickProvider === undefined
      ? {}
      : { tickProvider: options.tickProvider }),
    ...(options.timestampProvider === undefined
      ? {}
      : { timestampProvider: options.timestampProvider }),
    ...(options.idFactory === undefined
      ? {}
      : { idFactory: options.idFactory }),
  });

  const arenaStart = createArenaStartGuard(telemetry);
  const revive = createReviveTelemetryGuard(telemetry);
  const stateMirror = createStateMirrorProbe(telemetry);
  const progressProbes = new Set<EntityProgressProbe>();

  return {
    telemetry,
    scope,
    buffer,
    arenaStart,
    revive,
    stateMirror,

    captureDeferredGeneration(input) {
      return captureDeferredGeneration(telemetry, input);
    },

    createEntityProgressProbe(probeOptions) {
      const probe = createEntityProgressProbe(
        telemetry,
        probeOptions,
      );
      progressProbes.add(probe);
      return probe;
    },

    batch() {
      return buffer.batch({
        ...(options.sessionId === undefined
          ? {}
          : { sessionId: options.sessionId }),
        ...(options.artifactId === undefined
          ? {}
          : { artifactId: options.artifactId }),
      });
    },

    reset() {
      buffer.clear();
      scope.clear();
      arenaStart.clear();
      revive.reset();
      stateMirror.reset();
      for (const probe of progressProbes) probe.clear();
      progressProbes.clear();
    },
  };
}
