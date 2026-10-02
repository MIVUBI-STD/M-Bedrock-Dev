import type {
  GameplayIntentNodeKind,
} from "../../../gameplay-intent/src/index.js";

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
  readonly causalEdgeIds: readonly string[];
  readonly playerCounts: readonly number[];
}

export interface GameplayScenarioGraph {
  readonly schemaVersion: 1;
  readonly policy: "scenario-driven-causal-audit";
  readonly scenarios: readonly GameplayScenario[];
  readonly components: readonly GameplayScenarioComponent[];
  readonly edges: readonly GameplayCausalLink[];
}

export type GameplayScenarioClosureStatus =
  | "CLOSED"
  | "PARTIAL"
  | "OPEN";

export interface GameplayScenarioClosure {
  readonly status: GameplayScenarioClosureStatus;
  readonly orphanComponentIds: readonly string[];
  readonly missingPurposeComponentIds: readonly string[];
  readonly unresolvedEdgeIds: readonly string[];
  readonly runtimeBlockedEdgeIds: readonly string[];
  readonly detectionGapEdgeIds: readonly string[];
  readonly reasons: readonly string[];
}
