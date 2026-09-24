import { createVerificationReporter, type VerificationReporter } from "./reporters.js";
import {
  createActiveRuntimeProbeClient,
  type ActiveRuntimeProbeClient,
  type ActiveRuntimeProbeTransport,
} from "./active-probe.js";
import { frameTelemetryBatch, type TelemetryFrame } from "./framing.js";
import type {
  TelemetryBatch,
  TelemetryProducer,
} from "../../project-model/src/telemetry.js";
import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";
import {
  createTelemetryEmitter,
  createTelemetryScopeLease,
} from "./emitter.js";
import {
  createBufferedTelemetrySink,
  createFanoutTelemetrySink,
  createValidatingTelemetrySink,
} from "./sink.js";
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
import type {
  BufferedTelemetrySink,
  TelemetryEmitter,
  TelemetryIdFactory,
  TelemetrySink,
  TelemetryScopeLease,
} from "./types.js";

export interface TelemetryInstrumentationKitOptions {
  producer?: TelemetryProducer;
  sessionId?: string;
  artifactId?: string;
  maxEvents?: number;
  baseScope?: RuntimeScope;
  initialScope?: RuntimeScope;
  scopeProvider?: () => RuntimeScope | undefined;
  tickProvider?: () => number | undefined;
  timestampProvider?: () => string | undefined;
  streamId?: string;
  idFactory?: TelemetryIdFactory;
  transportSink?: TelemetrySink;
  activeProbeTransport?: ActiveRuntimeProbeTransport;
  probeRequestIdFactory?: () => string;
  validateEvents?: boolean;
}

export interface TelemetryInstrumentationKit {
  readonly emitter: TelemetryEmitter;
  readonly buffer: BufferedTelemetrySink;
  readonly scope: TelemetryScopeLease;
  readonly arenaStart: ArenaStartGuard;
  readonly revive: ReviveTelemetryGuard;
  readonly stateMirror: StateMirrorProbe;
  readonly verify: VerificationReporter;
  readonly activeProbe?: ActiveRuntimeProbeClient;

  captureGeneration(
    input: DeferredGenerationCapture,
  ): DeferredGenerationGuard;

  entityProgress(
    options: EntityProgressProbeOptions,
  ): EntityProgressProbe;

  batch(input?: {
    sessionId?: string;
    artifactId?: string;
  }): TelemetryBatch;

  drainBatch(input?: {
    sessionId?: string;
    artifactId?: string;
  }): TelemetryBatch;

  drainFrames(input: {
    batchId: string;
    maxPayloadCharacters: number;
    sessionId?: string;
    artifactId?: string;
  }): readonly TelemetryFrame[];

  resetRuntimeState(): void;
  clearBuffer(): void;
  clearAll(): void;
}

function mergeRuntimeScope(
  ...parts: Array<RuntimeScope | undefined>
): RuntimeScope {
  return Object.assign({}, ...parts.filter(Boolean));
}

export function createTelemetryInstrumentationKit(
  options: TelemetryInstrumentationKitOptions = {},
): TelemetryInstrumentationKit {
  const scope = createTelemetryScopeLease(options.initialScope ?? {});
  const buffer = createBufferedTelemetrySink(
    options.maxEvents ?? 1000,
  );

  const fanout = options.transportSink
    ? createFanoutTelemetrySink([buffer, options.transportSink])
    : buffer;
  const sink = options.validateEvents === false
    ? fanout
    : createValidatingTelemetrySink(fanout);

  const emitter = createTelemetryEmitter({
    producer: options.producer ?? "instrumentation",
    sink,
    ...(options.baseScope === undefined
      ? {}
      : { baseScope: options.baseScope }),
    scopeProvider: () =>
      mergeRuntimeScope(
        scope.current(),
        options.scopeProvider?.(),
      ),
    ...(options.tickProvider === undefined
      ? {}
      : { tickProvider: options.tickProvider }),
    ...(options.timestampProvider === undefined
      ? {}
      : { timestampProvider: options.timestampProvider }),
    ...(options.streamId ?? options.sessionId
      ? { streamId: options.streamId ?? options.sessionId }
      : {}),
    ...(options.idFactory === undefined
      ? {}
      : { idFactory: options.idFactory }),
  });

  const arenaStart = createArenaStartGuard(emitter);
  const revive = createReviveTelemetryGuard(emitter);
  const stateMirror = createStateMirrorProbe(emitter);
  const verify = createVerificationReporter(emitter);
  const activeProbe = options.activeProbeTransport
    ? createActiveRuntimeProbeClient({
        transport: options.activeProbeTransport,
        ...(options.baseScope === undefined
          ? {}
          : { baseScope: options.baseScope }),
        scopeProvider: () =>
          mergeRuntimeScope(
            scope.current(),
            options.scopeProvider?.(),
          ),
        ...(options.tickProvider === undefined
          ? {}
          : { tickProvider: options.tickProvider }),
        ...(options.probeRequestIdFactory === undefined
          ? {}
          : { requestIdFactory: options.probeRequestIdFactory }),
      })
    : undefined;
  const entityProgressProbes = new Set<EntityProgressProbe>();

  const resetRuntimeState = (): void => {
    scope.clear();
    arenaStart.clear();
    revive.reset();
    stateMirror.reset();
    for (const probe of entityProgressProbes) probe.clear();
    entityProgressProbes.clear();
  };

  return {
    emitter,
    buffer,
    scope,
    arenaStart,
    revive,
    stateMirror,
    verify,
    ...(activeProbe === undefined ? {} : { activeProbe }),

    captureGeneration(input) {
      return captureDeferredGeneration(emitter, input);
    },

    entityProgress(probeOptions) {
      const probe = createEntityProgressProbe(
        emitter,
        probeOptions,
      );
      entityProgressProbes.add(probe);
      return probe;
    },

    batch(input = {}) {
      const sessionId = input.sessionId ?? options.sessionId;
      const artifactId = input.artifactId ?? options.artifactId;
      return buffer.batch({
        ...(sessionId === undefined ? {} : { sessionId }),
        ...(artifactId === undefined ? {} : { artifactId }),
      });
    },

    drainBatch(input = {}) {
      const sessionId = input.sessionId ?? options.sessionId;
      const artifactId = input.artifactId ?? options.artifactId;
      return buffer.drainBatch({
        ...(sessionId === undefined ? {} : { sessionId }),
        ...(artifactId === undefined ? {} : { artifactId }),
      });
    },

    drainFrames(input) {
      const batch = this.drainBatch({
        ...(input.sessionId === undefined
          ? {}
          : { sessionId: input.sessionId }),
        ...(input.artifactId === undefined
          ? {}
          : { artifactId: input.artifactId }),
      });
      return frameTelemetryBatch(batch, {
        batchId: input.batchId,
        maxPayloadCharacters: input.maxPayloadCharacters,
      });
    },

    resetRuntimeState,

    clearBuffer() {
      buffer.clear();
    },

    clearAll() {
      resetRuntimeState();
      buffer.clear();
    },
  };
}
