import type { RuntimeObservationPoint } from "./runtime-evidence.js";

export type RuntimeFirstWrongStatus =
  | "identified"
  | "ambiguous"
  | "not-observed";

export interface RuntimeFirstWrongCandidate {
  requirementId: string;
  predicate: string;
  status: "violated-order" | "missing-before";
  detectedAt?: RuntimeObservationPoint;
  reason: string;
}

export interface RuntimeFirstWrongTransition {
  status: RuntimeFirstWrongStatus;
  candidate?: RuntimeFirstWrongCandidate;
  competingCandidates: readonly RuntimeFirstWrongCandidate[];
  reason: string;
}
