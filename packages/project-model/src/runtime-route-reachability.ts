import type {
  RuntimeObservationPoint,
  RuntimeScope,
} from "./runtime-evidence.js";

export interface RuntimeRouteReachabilityObservation {
  entityKey: string;
  reachable: boolean;
  routeId?: string;
  routeIndex?: number;
  mechanism?: string;
  scope: RuntimeScope;
  observedAt?: RuntimeObservationPoint;
  evidenceId: string;
}
