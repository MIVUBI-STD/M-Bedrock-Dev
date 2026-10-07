import type {
  GameplayIntentNodeKind,
} from "../../../gameplay-intent/src/index.js";
import type {
  AnalysisKnowledgeDomain,
} from "../../../analysis-planner/src/index.js";

export type GameplayKnowledgeDomain = AnalysisKnowledgeDomain;

export interface GameplayKnowledgeRequirement {
  readonly id: string;
  readonly scenarioId: string;
  readonly domain: GameplayKnowledgeDomain;
  readonly reason: string;
  readonly capabilityIds: readonly string[];
  readonly dependsOnRequirementIds: readonly string[];
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
}

export type GameplayKnowledgeReceiptStatus =
  | "SATISFIED"
  | "BLOCKED_BY_PREREQUISITE"
  | "MISSING_REQUIRED_KNOWLEDGE"
  | "CAPABILITY_GAP";

export interface GameplayKnowledgeReceipt {
  readonly requirementId: string;
  readonly scenarioId: string;
  readonly domain: GameplayKnowledgeDomain;
  readonly status: GameplayKnowledgeReceiptStatus;
  readonly evidenceIds: readonly string[];
  /** Exact engine knowledge relations/facts that materially support this scenario requirement. */
  readonly knowledgeIds: readonly string[];
  readonly capabilityIdsUsed: readonly string[];
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
  readonly reason: string;
}

export interface GameplayRequiredInspectionGraph {
  readonly policy: "required-inspection-graph";
  readonly nodes: readonly GameplayKnowledgeRequirement[];
  readonly receipts: readonly GameplayKnowledgeReceipt[];
}

export type GameplayCausalLinkStatus =
  | "PROVEN"
  | "CONTRADICTED"
  | "RUNTIME_BLOCKED"
  | "DETECTION_GAP";

export interface GameplayScenarioComponent {
  readonly id: string;
  readonly label: string;
  readonly kind:
    | GameplayIntentNodeKind
    | "runtime-domain";
  readonly technicalRole: string;
  readonly gameplayPurpose: string;
  readonly evidenceIds: readonly string[];
  readonly usedByScenarioIds: readonly string[];
  readonly orphan: boolean;
}

export interface GameplayCausalLink {
  readonly id: string;
  readonly scenarioId: string;
  readonly fromComponentId: string;
  readonly toComponentId: string;
  readonly purpose: string;
  readonly evidenceIds: readonly string[];
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
  /** All scenario knowledge requirements that materially support this dependency. */
  readonly knowledgeRequirementIds: readonly string[];
  /** Proven selected-artifact dependency path from this link toward a player-facing objective/outcome. */
  readonly impactPathComponentIds: readonly string[];
  /** Selected-artifact evidence for every proven edge in impactPathComponentIds. Empty when no complete proven path exists. */
  readonly impactPathEvidenceIds: readonly string[];
  readonly intentEdgeKind?: import("../../../gameplay-intent/src/index.js").GameplayIntentEdgeKind;
  readonly status: GameplayCausalLinkStatus;
  readonly reason: string;
}

export interface GameplayScenario {
  readonly id: string;
  readonly label: string;
  readonly gameplayStage: string;
  readonly purpose: string;
  readonly sourceSubjectIds: readonly string[];
  readonly componentIds: readonly string[];
  readonly causalLinkIds: readonly string[];
  readonly playerCounts: readonly number[];
  readonly requiredKnowledgeIds: readonly string[];
  readonly composedScenarioIds: readonly string[];
}

export interface GameplayScenarioGraph {
  readonly schemaVersion: 1;
  readonly policy: "scenario-driven-causal-audit";
  readonly scenarios: readonly GameplayScenario[];
  readonly components: readonly GameplayScenarioComponent[];
  readonly causalLinks: readonly GameplayCausalLink[];
  readonly knowledgeRequirements: readonly GameplayKnowledgeRequirement[];
  readonly knowledgeReceipts: readonly GameplayKnowledgeReceipt[];
  readonly requiredInspectionGraph: GameplayRequiredInspectionGraph;
}

export type GameplayScenarioClosureStatus =
  | "CLOSED"
  | "PARTIAL"
  | "OPEN";

export interface GameplayRuntimeProofRequest {
  readonly causalLinkId: string;
  readonly scenarioId: string;
  readonly runtimeReason: string;
  readonly narrowRuntimeQuestion: string;
  readonly evidenceIds: readonly string[];
}

export interface GameplayDetectionGapTestRequest {
  readonly causalLinkId: string;
  readonly scenarioId: string;
  readonly gapReason: string;
  readonly narrowTestQuestion: string;
  readonly evidenceIds: readonly string[];
}

export interface GameplayScenarioClosure {
  readonly status: GameplayScenarioClosureStatus;
  readonly orphanComponentIds: readonly string[];
  readonly missingPurposeComponentIds: readonly string[];
  readonly unresolvedCausalLinkIds: readonly string[];
  readonly runtimeBlockedCausalLinkIds: readonly string[];
  readonly runtimeProofRequests: readonly GameplayRuntimeProofRequest[];
  readonly detectionGapCausalLinkIds: readonly string[];
  readonly detectionGapTestRequests: readonly GameplayDetectionGapTestRequest[];
  readonly missingRequiredKnowledgeIds: readonly string[];
  readonly capabilityGapKnowledgeIds: readonly string[];
  readonly prerequisiteBlockedKnowledgeIds: readonly string[];
  readonly incompleteCompositionScenarioIds: readonly string[];
  /**
   * Leaf scenarios with selected-artifact components but no causal proof edge.
   * These are treated as suspiciously shallow audit coverage.
   */
  readonly unprovenLeafScenarioIds: readonly string[];
  readonly reasons: readonly string[];
}
