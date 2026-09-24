export type DiagnosticExecutionContext =
  | "REMOTE_GITHUB"
  | "LOCAL_ARTIFACT"
  | "LOCAL_MINECRAFT"
  | "LIVE_MINECRAFT";

export type DiagnosticProbeMutationRisk =
  | "read-only"
  | "guarded"
  | "mutating";

export interface DiagnosticProbeOutcome {
  id: string;
  observation: string;
  supportsCandidateIds?: readonly string[];
  rejectsCandidateIds?: readonly string[];
}

export interface DiagnosticProbeDefinition {
  id: string;
  label: string;
  requiredContext: DiagnosticExecutionContext;
  costUnits: number;
  mutationRisk: DiagnosticProbeMutationRisk;
  outcomes: readonly DiagnosticProbeOutcome[];
  rationale?: string;
}

export interface DiagnosticProbePlanItem {
  probeId: string;
  label: string;
  requiredContext: DiagnosticExecutionContext;
  costUnits: number;
  mutationRisk: DiagnosticProbeMutationRisk;
  coveredCandidateIds: readonly string[];
  pairSeparationCount: number;
  score: number;
  rationale?: string;
}

export interface DiagnosticProbePlan {
  incidentId: string;
  availableContext: DiagnosticExecutionContext;
  unresolvedCandidateIds: readonly string[];
  recommended: readonly DiagnosticProbePlanItem[];
  blockedByContext: readonly DiagnosticProbePlanItem[];
  stopCondition:
    | "candidate-proven"
    | "candidate-set-not-discriminable"
    | "candidate-set-exhausted"
    | "no-probe-required";
}
