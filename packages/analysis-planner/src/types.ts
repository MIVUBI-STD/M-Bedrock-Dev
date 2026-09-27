export type AnalysisEvidenceLevel =
  | "metadata"
  | "static"
  | "semantic"
  | "formal"
  | "runtime"
  | "intervention";

export type AnalysisGoal =
  | "artifact-fact"
  | "structural-consistency"
  | "semantic-consistency"
  | "intent-classification"
  | "contradiction-proof"
  | "runtime-evidence-integrity"
  | "runtime-behavior"
  | "causal-repair";

export type AnalysisExecutionContext =
  | "REMOTE_GITHUB"
  | "LOCAL_ARTIFACT"
  | "LOCAL_MINECRAFT"
  | "LIVE_MINECRAFT";

export type AnalysisCostClass =
  | "cheap"
  | "moderate"
  | "expensive"
  | "very-expensive";

export interface AnalysisCapability {
  id: string;
  evidenceLevel: AnalysisEvidenceLevel;
  cost: AnalysisCostClass;
  tags: readonly string[];
  deterministic: boolean;
  contexts: readonly AnalysisExecutionContext[];
  prerequisites?: readonly string[];
}

export interface AnalysisEvidenceSnapshot {
  level: AnalysisEvidenceLevel;
  evidenceIds: readonly string[];
}

export interface MinimumSufficientAnalysisInput {
  goal: AnalysisGoal;
  relevantTags: readonly string[];
  context: AnalysisExecutionContext;
  availableEvidence?: readonly AnalysisEvidenceSnapshot[];
  completedCapabilityIds?: readonly string[];
  capabilities: readonly AnalysisCapability[];
}

export type AnalysisPlanDisposition =
  | "stop-sufficient"
  | "execute"
  | "requires-runtime-context"
  | "capability-gap";

export interface PlannedAnalysisStep {
  capabilityId: string;
  evidenceLevel: AnalysisEvidenceLevel;
  cost: AnalysisCostClass;
  reasons: readonly string[];
}

export interface MinimumSufficientAnalysisPlan {
  goal: AnalysisGoal;
  requiredEvidenceLevel: AnalysisEvidenceLevel;
  currentEvidenceLevel?: AnalysisEvidenceLevel;
  disposition: AnalysisPlanDisposition;
  steps: readonly PlannedAnalysisStep[];
  skippedCapabilityIds: readonly string[];
  reasons: readonly string[];
}
