import type {
  GameplayIntentNodeKind,
} from "../../../gameplay-intent/src/index.js";

export type GameplayKnowledgeDomain =
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
  | "temporal-ownership";

export interface GameplayKnowledgeRequirement {
  readonly id: string;
  readonly scenarioId: string;
  readonly domain: GameplayKnowledgeDomain;
  readonly reason: string;
  readonly capabilityIds: readonly string[];
}

export type GameplayKnowledgeReceiptStatus =
  | "SATISFIED"
  | "MISSING_REQUIRED_KNOWLEDGE"
  | "CAPABILITY_GAP";

export interface GameplayKnowledgeReceipt {
  readonly requirementId: string;
  readonly scenarioId: string;
  readonly domain: GameplayKnowledgeDomain;
  readonly status: GameplayKnowledgeReceiptStatus;
  readonly evidenceIds: readonly string[];
  readonly reason: string;
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
}

export interface GameplayScenarioGraph {
  readonly schemaVersion: 1;
  readonly policy: "scenario-driven-causal-audit";
  readonly scenarios: readonly GameplayScenario[];
  readonly components: readonly GameplayScenarioComponent[];
  readonly causalLinks: readonly GameplayCausalLink[];
  readonly knowledgeRequirements: readonly GameplayKnowledgeRequirement[];
  readonly knowledgeReceipts: readonly GameplayKnowledgeReceipt[];
}

export type GameplayScenarioClosureStatus =
  | "CLOSED"
  | "PARTIAL"
  | "OPEN";

export interface GameplayScenarioClosure {
  readonly status: GameplayScenarioClosureStatus;
  readonly orphanComponentIds: readonly string[];
  readonly missingPurposeComponentIds: readonly string[];
  readonly unresolvedCausalLinkIds: readonly string[];
  readonly runtimeBlockedCausalLinkIds: readonly string[];
  readonly detectionGapCausalLinkIds: readonly string[];
  readonly missingRequiredKnowledgeIds: readonly string[];
  readonly capabilityGapKnowledgeIds: readonly string[];
  readonly reasons: readonly string[];
}
