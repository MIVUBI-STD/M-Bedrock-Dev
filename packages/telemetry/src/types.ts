import type {
  TelemetryBatch,
  TelemetryEvent,
  TelemetryProducer,
} from "../../project-model/src/telemetry.js";
import type { RuntimeScope } from "../../project-model/src/runtime-evidence.js";

export type TelemetryEventInput<T extends TelemetryEvent> =
  Omit<
    T,
    "schemaVersion" | "eventId" | "kind" | "producer" | "scope" | "sequence" | "streamId"
  > & {
    scope?: RuntimeScope;
  };

export interface TelemetrySink {
  emit(event: TelemetryEvent): void;
}

export interface TelemetryIdFactory {
  next(kind: TelemetryEvent["kind"]): string;
}

export interface TelemetryEmitterOptions {
  producer: TelemetryProducer;
  sink: TelemetrySink;
  baseScope?: RuntimeScope;
  scopeProvider?: () => RuntimeScope | undefined;
  tickProvider?: () => number | undefined;
  timestampProvider?: () => string | undefined;
  streamId?: string;
  idNamespace?: string;
  idFactory?: TelemetryIdFactory;
}

export interface TelemetryEmitter {
  emit(event: TelemetryEvent): TelemetryEvent;
  entityStall(
    input: TelemetryEventInput<
      Extract<TelemetryEvent, { kind: "entity-stall" }>
    >,
  ): Extract<TelemetryEvent, { kind: "entity-stall" }>;
  teleportFallback(
    input: TelemetryEventInput<
      Extract<TelemetryEvent, { kind: "teleport-fallback" }>
    >,
  ): Extract<TelemetryEvent, { kind: "teleport-fallback" }>;
  arenaDoubleStart(
    input: TelemetryEventInput<
      Extract<TelemetryEvent, { kind: "arena-double-start" }>
    >,
  ): Extract<TelemetryEvent, { kind: "arena-double-start" }>;
  staleCallback(
    input: TelemetryEventInput<
      Extract<TelemetryEvent, { kind: "stale-callback" }>
    >,
  ): Extract<TelemetryEvent, { kind: "stale-callback" }>;
  reviveAnomaly(
    input: TelemetryEventInput<
      Extract<TelemetryEvent, { kind: "revive-anomaly" }>
    >,
  ): Extract<TelemetryEvent, { kind: "revive-anomaly" }>;
  stateDrift(
    input: TelemetryEventInput<
      Extract<TelemetryEvent, { kind: "state-drift" }>
    >,
  ): Extract<TelemetryEvent, { kind: "state-drift" }>;
  routeRevalidation(
    input: TelemetryEventInput<
      Extract<TelemetryEvent, { kind: "route-revalidation" }>
    >,
  ): Extract<TelemetryEvent, { kind: "route-revalidation" }>;
  mutationApplied(
    input: TelemetryEventInput<
      Extract<TelemetryEvent, { kind: "mutation-applied" }>
    >,
  ): Extract<TelemetryEvent, { kind: "mutation-applied" }>;
  mutationVerification(
    input: TelemetryEventInput<
      Extract<TelemetryEvent, { kind: "mutation-verification" }>
    >,
  ): Extract<TelemetryEvent, { kind: "mutation-verification" }>;
}

export interface BufferedTelemetrySink extends TelemetrySink {
  readonly size: number;
  readonly dropped: number;
  snapshot(): readonly TelemetryEvent[];
  clear(): void;
  batch(input?: {
    sessionId?: string;
    artifactId?: string;
  }): TelemetryBatch;
  drainBatch(input?: {
    sessionId?: string;
    artifactId?: string;
  }): TelemetryBatch;
}

export interface TelemetryScopeLease {
  current(): RuntimeScope;
  replace(scope: RuntimeScope): void;
  patch(scope: RuntimeScope): void;
  clear(): void;
}
