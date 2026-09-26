export type DiagnosticEvidenceState =
  | "present"
  | "absent"
  | "unknown";

export interface DiagnosticEvidenceObservation {
  predicate: string;
  state: DiagnosticEvidenceState;
  evidenceId?: string;
}

export interface DiagnosticInterventionExpectation {
  interventionId: string;
  outcomePredicate: string;
  expectedState: Exclude<
    DiagnosticEvidenceState,
    "unknown"
  >;
}

export interface DiagnosticHypothesis {
  id: string;
  statement: string;
  requiredPredicates?: readonly string[];
  supportingPredicates?: readonly string[];
  falsifierPredicates?: readonly string[];
  interventionExpectations?: readonly DiagnosticInterventionExpectation[];
}

export interface DiagnosticHypothesisSet {
  schemaVersion: 1;
  id: string;
  hypotheses: readonly DiagnosticHypothesis[];
}

export type HypothesisDisposition =
  | "open"
  | "supported"
  | "eliminated";

export interface HypothesisAssessment {
  hypothesisId: string;
  disposition: HypothesisDisposition;
  supportingEvidenceIds: readonly string[];
  eliminatingEvidenceIds: readonly string[];
  missingRequiredPredicates: readonly string[];
  reasons: readonly string[];
}

export interface DiagnosticProbeOutcomePrediction {
  hypothesisId: string;
  state: Exclude<
    DiagnosticEvidenceState,
    "unknown"
  >;
}

export interface DiagnosticProbeCandidate {
  id: string;
  predicate: string;
  cost: number;
  risk: number;
  predictions: readonly DiagnosticProbeOutcomePrediction[];
}

export interface DiagnosticProbeScore {
  probeId: string;
  pairwiseSeparations: number;
  coveredHypotheses: number;
  cost: number;
  risk: number;
  utility: number;
}
