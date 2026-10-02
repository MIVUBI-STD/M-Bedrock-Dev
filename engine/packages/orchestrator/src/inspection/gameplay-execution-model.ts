import type {
  GameplayIntentNodeKind,
} from "../../../gameplay-intent/src/index.js";

export type GameplayExecutionEdgeStatus =
  | "PROVEN"
  | "CONTRADICTED"
  | "RUNTIME_BLOCKED"
  | "DETECTION_GAP";

export interface GameplayExecutionComponent {
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

export interface GameplayExecutionEdge {
  readonly id: string;
  readonly scenarioId: string;
  readonly fromComponentId: string;
  readonly toComponentId: string;
  readonly purpose: string;
  readonly evidenceIds: readonly string[];
  readonly status: GameplayExecutionEdgeStatus;
  readonly reason: string;
}

export interface GameplayExecutionScenario {
  readonly id: string;
  readonly label: string;
  readonly gameplayStage: string;
  readonly purpose: string;
  readonly sourceSubjectIds: readonly string[];
  readonly componentIds: readonly string[];
  readonly causalEdgeIds: readonly string[];
  readonly playerCounts: readonly number[];
}

export interface GameplayExecutionGraph {
  readonly schemaVersion: 1;
  readonly policy: "scenario-driven-causal-execution";
  readonly scenarios: readonly GameplayExecutionScenario[];
  readonly components: readonly GameplayExecutionComponent[];
  readonly edges: readonly GameplayExecutionEdge[];
}

export type GameplayExecutionClosureStatus =
  | "CLOSED"
  | "PARTIAL"
  | "OPEN";

export interface GameplayExecutionClosure {
  readonly status: GameplayExecutionClosureStatus;
  readonly orphanComponentIds: readonly string[];
  readonly missingPurposeComponentIds: readonly string[];
  readonly unresolvedEdgeIds: readonly string[];
  readonly runtimeBlockedEdgeIds: readonly string[];
  readonly detectionGapEdgeIds: readonly string[];
  readonly reasons: readonly string[];
}
