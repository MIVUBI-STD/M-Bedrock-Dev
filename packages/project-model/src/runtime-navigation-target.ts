import type {
  RuntimeObservationPoint,
  RuntimeScope,
} from "./runtime-evidence.js";

export interface RuntimeNavigationTargetObservation {
  entityKey: string;
  targetLocation: {
    x: number;
    y: number;
    z: number;
  };
  routeId?: string;
  routeIndex?: number;
  mechanism?: string;
  scope: RuntimeScope;
  observedAt?: RuntimeObservationPoint;
  evidenceId: string;
}
