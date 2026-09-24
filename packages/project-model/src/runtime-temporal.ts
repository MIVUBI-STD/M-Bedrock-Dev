import type {
  RuntimeEvidenceRecord,
  RuntimeScope,
} from "./runtime-evidence.js";

export interface RuntimeTemporalRequirement {
  id: string;
  beforePredicate: string;
  afterPredicate: string;
  scope?: RuntimeScope;
  maxTickDelta?: number;
}

export type RuntimeTemporalAssessmentStatus =
  | "satisfied"
  | "violated-order"
  | "missing-before"
  | "missing-after"
  | "unresolved-order"
  | "evidence-incomplete";

export interface RuntimeTemporalAssessment {
  requirementId: string;
  status: RuntimeTemporalAssessmentStatus;
  beforePredicate: string;
  afterPredicate: string;
  before?: RuntimeEvidenceRecord;
  after?: RuntimeEvidenceRecord;
  reason: string;
}
