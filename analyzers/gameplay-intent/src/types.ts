import type {
  GameplayIntentEdgeKind,
  GameplayIntentEvidenceOrigin,
  GameplayIntentNodeKind,
  GameplayIntentPolicyPredicate,
  GameplayIntentStatus,
} from "../../../packages/gameplay-intent/src/index.js";

export interface GameplayIntentSignal {
  id: string;
  subjectKey: string;
  nodeKind: GameplayIntentNodeKind;
  label: string;
  status: GameplayIntentStatus;
  evidenceOrigin: GameplayIntentEvidenceOrigin;
  locator: string;
  summary: string;
  policyPredicate?: GameplayIntentPolicyPredicate;
}

export interface GameplayIntentRelationSignal {
  id: string;
  fromSubjectKey: string;
  toSubjectKey: string;
  edgeKind: GameplayIntentEdgeKind;
  status: GameplayIntentStatus;
  evidenceOrigin: GameplayIntentEvidenceOrigin;
  locator: string;
  summary: string;
}

export interface GameplayOutcomePolicyCoverage {
  outcomeSubjectKey: string;
  totalLiteralReturnSites: number;
  directlyGuardedReturnSites: number;
  completeDirectGuardCoverage: boolean;
}

export interface GameplayIntentSignalSet {
  schemaVersion: 1;
  signals: readonly GameplayIntentSignal[];
  relations: readonly GameplayIntentRelationSignal[];
  outcomePolicyCoverage: readonly GameplayOutcomePolicyCoverage[];
}
