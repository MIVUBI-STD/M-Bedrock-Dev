import type {
  RuntimeObservationPoint,
  RuntimeScope,
} from "./runtime-evidence.js";

export interface RuntimeNavigationStallObservation {
  entityKey: string;
  routeId?: string;
  stalledTicks?: number;
  distanceDelta?: number;
  scope: RuntimeScope;
  observedAt?: RuntimeObservationPoint;
  evidenceId: string;
}
