import type { ParsedScriptFile } from "../../scripts/src/index.js";
import type {
  GameplayIntentEdgeKind,
  GameplayIntentEvidenceOrigin,
  GameplayIntentNodeKind,
  GameplayIntentPolicyPredicate,
  GameplayIntentSpatialProfile,
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
  spatialProfile?: GameplayIntentSpatialProfile;
}

export interface GameplayIntentRelationSignal {
  id: string;
  /** Exact parsed local call sites, not merely a lexical relationship hint. */
  localCallOrigins?: readonly {
    scriptSource: ParsedScriptFile["source"];
    call: ParsedScriptFile["localFunctionCalls"][number];
  }[];
  /** Parsed event or scheduler origin; exact IR ID is resolved by the model stage. */
  callbackOrigins?: readonly (
    | { kind: "event"; scriptSource: ParsedScriptFile["source"];
        scriptIdentifier: string; event: ParsedScriptFile["events"][number] }
    | { kind: "scheduler"; scriptSource: ParsedScriptFile["source"];
        callback: ParsedScriptFile["deferredCallbacks"][number] }
  )[];
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
