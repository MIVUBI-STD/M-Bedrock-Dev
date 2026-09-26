import type {
  DiagnosticExecutionContext,
  RuntimeEvidenceRecord,
} from "../../project-model/src/index.js";

export type RuntimeExperimentDomain =
  | "scheduler"
  | "event-ordering"
  | "chunks"
  | "entity-lifecycle"
  | "entity-ai"
  | "multiplayer"
  | "persistence"
  | "commands"
  | "state"
  | "education-runtime"
  | "compatibility";

export type RuntimeExperimentMutationRisk =
  | "read-only"
  | "guarded"
  | "mutating";

export interface RuntimeExperimentFactor {
  id: string;
  description: string;
}

export type RuntimeExperimentProtocolPhase =
  | "setup"
  | "stimulus"
  | "observe"
  | "teardown";

export interface RuntimeExperimentProtocolStep {
  id: string;
  phase: RuntimeExperimentProtocolPhase;
  actionId: string;
  parameters?: Readonly<
    Record<string, string | number | boolean>
  >;
}

export interface RuntimeExperimentArm {
  id: string;
  role: "control" | "treatment";
  factorValues: Readonly<Record<string, string | number | boolean>>;
}

export interface RuntimeExperimentDefinition {
  schemaVersion: 1;
  id: string;
  title: string;
  domain: RuntimeExperimentDomain;
  requiredContext: Extract<
    DiagnosticExecutionContext,
    "LOCAL_MINECRAFT" | "LIVE_MINECRAFT"
  >;
  mutationRisk: RuntimeExperimentMutationRisk;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  hypothesisId?: string;
  protocol: readonly RuntimeExperimentProtocolStep[];
  factors: readonly RuntimeExperimentFactor[];
  arms: readonly RuntimeExperimentArm[];
  outcomePredicateIds: readonly string[];
  preservationInvariantIds?: readonly string[];
  minimumRunsPerArm: number;
}

export interface RuntimeExperimentTrialIdentity {
  experimentId: string;
  definitionRevision: string;
  armId: string;
  runIndex: number;
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  environmentFingerprint: string;
}

export type RuntimeExperimentTrialStatus =
  | "completed"
  | "failed"
  | "unknown";

export interface RuntimeExperimentTrial {
  schemaVersion: 1;
  id: string;
  identity: RuntimeExperimentTrialIdentity;
  status: RuntimeExperimentTrialStatus;
  startedAt?: string;
  completedAt?: string;
  startTick?: number;
  endTick?: number;
  evidence: readonly RuntimeEvidenceRecord[];
  error?: string;
}

export type RuntimeExperimentOutcomeState =
  | "present"
  | "absent"
  | "unknown";

export interface RuntimeExperimentTrialOutcome {
  trialId: string;
  armId: string;
  runIndex: number;
  predicateId: string;
  state: RuntimeExperimentOutcomeState;
  evidenceIds: readonly string[];
}

export type RuntimeExperimentQualificationState =
  | "insufficient"
  | "observed"
  | "repeatable"
  | "intervention-supported";

export interface RuntimeExperimentQualification {
  experimentId: string;
  state: RuntimeExperimentQualificationState;
  completedRunsByArm: Readonly<Record<string, number>>;
  unknownOutcomes: number;
  controlTreatmentContrastPredicates: readonly string[];
  evidenceIds: readonly string[];
  reasons: readonly string[];
}
