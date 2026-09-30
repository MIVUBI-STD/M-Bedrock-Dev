import type {
  RuntimeObservationPoint,
  RuntimeScope,
} from "./runtime-evidence.js";

export interface RuntimeOutcomeObservation {
  outcomeId: string;
  scope?: RuntimeScope;
  observedAt?: RuntimeObservationPoint;
  evidenceId: string;
}
