import type { RuntimeScope } from "./runtime-evidence.js";
import type { SourceRef } from "./source-ref.js";
import type {
  StateObservedValue,
  StateSurfaceRef,
} from "./state-authority-contract.js";

export type TelemetryProducer =
  | "runtime"
  | "qa"
  | "manual"
  | "instrumentation"
  | "server";

export interface TelemetryEventBase {
  schemaVersion: 1;
  eventId: string;
  kind: string;
  producer: TelemetryProducer;
  scope: RuntimeScope;
  tick?: number;
  sequence?: number;
  timestamp?: string;
  sourceRefs?: readonly SourceRef[];
  note?: string;
}

export interface EntityStallTelemetryEvent extends TelemetryEventBase {
  kind: "entity-stall";
  entityKey: string;
  routeId?: string;
  stalledTicks?: number;
  distanceDelta?: number;
}

export interface TeleportFallbackTelemetryEvent extends TelemetryEventBase {
  kind: "teleport-fallback";
  entityKey?: string;
  playerKey?: string;
  reason?: string;
  routeId?: string;
}

export interface ArenaDoubleStartTelemetryEvent extends TelemetryEventBase {
  kind: "arena-double-start";
  arenaId: string;
  arenaGeneration: number;
  startOperationIds?: readonly string[];
}

export interface StaleCallbackTelemetryEvent extends TelemetryEventBase {
  kind: "stale-callback";
  subsystem: string;
  callbackKind?: string;
  capturedGeneration?: number;
  currentGeneration?: number;
}

export type ReviveAnomalyKind =
  | "self-revive"
  | "multiple-revivers"
  | "stale-revive"
  | "revive-after-death"
  | "invalid-reviver";

export interface ReviveAnomalyTelemetryEvent extends TelemetryEventBase {
  kind: "revive-anomaly";
  anomaly: ReviveAnomalyKind;
  targetPlayerKey: string;
  reviverPlayerKey?: string;
}

export interface StateDriftTelemetryEvent extends TelemetryEventBase {
  kind: "state-drift";
  contractId: string;
  authority: {
    surface: StateSurfaceRef;
    value: StateObservedValue;
    revision?: number;
  };
  mirror: {
    surface: StateSurfaceRef;
    value: StateObservedValue;
    revision?: number;
  };
}

export interface RouteRevalidationTelemetryEvent extends TelemetryEventBase {
  kind: "route-revalidation";
  routeId: string;
  result: "passed" | "failed";
}

export interface MutationVerificationTelemetryEvent extends TelemetryEventBase {
  kind: "mutation-verification";
  result: "passed" | "failed";
  mechanism?: string;
}

export type TelemetryEvent =
  | EntityStallTelemetryEvent
  | TeleportFallbackTelemetryEvent
  | ArenaDoubleStartTelemetryEvent
  | StaleCallbackTelemetryEvent
  | ReviveAnomalyTelemetryEvent
  | StateDriftTelemetryEvent
  | RouteRevalidationTelemetryEvent
  | MutationVerificationTelemetryEvent;

export interface TelemetryBatch {
  schemaVersion: 1;
  sessionId?: string;
  artifactId?: string;
  droppedEvents?: number;
  events: readonly TelemetryEvent[];
}
