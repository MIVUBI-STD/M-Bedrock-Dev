import type {
  RuntimeObservationPoint,
  RuntimeScope,
} from "./runtime-evidence.js";

export type RuntimeRouteChunkAvailabilityState =
  | "loaded"
  | "not-loaded"
  | "unknown";

export interface RuntimeRouteChunkAvailabilityObservation {
  requestId: string;
  state: RuntimeRouteChunkAvailabilityState;
  scope?: RuntimeScope;
  observedAt?: RuntimeObservationPoint;
  evidenceId: string;
}
