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
  | "contract-evidence"
  | "contradiction-proof"
  | "runtime-evidence-integrity"
  | "runtime-behavior"
  | "causal-repair";

export type AnalysisEvidenceQuality =
  | "usable"
  | "stale"
  | "conflicting"
  | "target-mismatch"
  | "incomplete";

export type AnalysisEvidenceTrait =
  | "artifact-identity"
  | "structural-proof"
  | "semantic-model"
  | "intent-grounded"
  | "contract-evidence"
  | "contradiction"
  | "runtime-observation"
  | "runtime-integrity"
  | "intervention";

export type AnalysisExecutionContext =
  | "REMOTE_GITHUB"
  | "LOCAL_ARTIFACT"
  | "LOCAL_MINECRAFT"
  | "LIVE_MINECRAFT";

export type AnalysisKnowledgeDomain =
  | "state-flow"
  | "arena-lifecycle"
  | "multiplayer-interleaving"
  | "chunk-simulation"
  | "entity-behavior"
  | "combat-lifecycle"
  | "inventory-state"
  | "persistence-recovery"
  | "world-structure"
  | "economy-reward"
  | "spatial-authority"
  | "temporal-ownership"
  | "platform-constraints";

export type AnalysisExecutionPhase =
  | "discovery-core"
  | "rig-directed";

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
  knowledgeDomains?: readonly AnalysisKnowledgeDomain[];
  executionPhase: AnalysisExecutionPhase;
  deterministic: boolean;
  contexts: readonly AnalysisExecutionContext[];
  producesTraits?: readonly AnalysisEvidenceTrait[];
  prerequisites?: readonly string[];
}

export interface AnalysisEvidenceSnapshot {
  level: AnalysisEvidenceLevel;
  evidenceIds: readonly string[];
  quality: AnalysisEvidenceQuality;
  traits: readonly AnalysisEvidenceTrait[];
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
  requiredEvidenceTraits: readonly AnalysisEvidenceTrait[];
  currentEvidenceLevel?: AnalysisEvidenceLevel;
  missingEvidenceTraits: readonly AnalysisEvidenceTrait[];
  disposition: AnalysisPlanDisposition;
  steps: readonly PlannedAnalysisStep[];
  skippedCapabilityIds: readonly string[];
  reasons: readonly string[];
}
