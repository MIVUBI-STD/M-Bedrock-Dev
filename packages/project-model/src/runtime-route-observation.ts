import type {
  RuntimeObservationPoint,
  RuntimeScope,
} from "./runtime-evidence.js";

export interface RuntimeRouteObservation {
  entityKey: string;
  routeId?: string;
  routeIndex?: number;
  worldLocation: {
    x: number;
    y: number;
    z: number;
  };
  scope: RuntimeScope;
  observedAt?: RuntimeObservationPoint;
  evidenceId: string;
}
