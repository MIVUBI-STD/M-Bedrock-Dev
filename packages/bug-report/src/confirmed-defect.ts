import type {
  SourceRef,
} from "../../project-model/src/index.js";
import type {
  BugImpactAssessment,
  BugPrimaryFailure,
} from "./decision.js";
import type {
  DefectConfirmation,
} from "./promote-v2.js";
import type {
  BugReportV2FoundBy,
  BugReportV2RelevantCode,
} from "./v2.js";
import type {
  ExpectedBehaviorAuthority,
} from "./confirmation-v2.js";

export interface ConfirmedDefectExpectedBasis {
  readonly authority: ExpectedBehaviorAuthority;
  readonly statement: string;
  readonly evidenceIds: readonly string[];
}

export interface ConfirmedDefectObservation {
  readonly statement: string;
  readonly evidenceIds: readonly string[];
}

export interface ConfirmedDefect {
  readonly semanticKey: string;
  readonly foundBy: BugReportV2FoundBy;
  readonly confirmation: DefectConfirmation;
  readonly impact: BugImpactAssessment;
  readonly primaryFailure: BugPrimaryFailure;
  readonly title: string;
  readonly problem: string;
  readonly expected: ConfirmedDefectExpectedBasis;
  readonly observed: ConfirmedDefectObservation;
  readonly reproduction?: readonly string[];
  readonly aiAnalysis?: string;
  readonly sourceRefs?: readonly SourceRef[];
  readonly relevantCode?: readonly BugReportV2RelevantCode[];
  readonly suggestedFix?: string;
  readonly mustPreserve?: readonly string[];
  readonly brokenInvariantIds: readonly string[];
  readonly repairUnitIds: readonly string[];
  readonly causalIncidentId?: string;
}

export function validateConfirmedDefect(
  defect: ConfirmedDefect,
): readonly string[] {
  const errors: string[] = [];

  if (!defect.semanticKey.trim()) {
    errors.push("semanticKey must be non-empty.");
  }
  if (!defect.title.trim()) {
    errors.push("title must be non-empty.");
  }
  if (!defect.problem.trim()) {
    errors.push("problem must be non-empty.");
  }
  if (!defect.expected.statement.trim()) {
    errors.push("expected.statement must be non-empty.");
  }
  if (defect.expected.evidenceIds.length === 0) {
    errors.push("expected.evidenceIds must contain authoritative evidence.");
  }
  if (!defect.observed.statement.trim()) {
    errors.push("observed.statement must be non-empty.");
  }
  if (defect.observed.evidenceIds.length === 0) {
    errors.push("observed.evidenceIds must contain defect evidence.");
  }
  if (defect.brokenInvariantIds.length === 0) {
    errors.push("brokenInvariantIds must identify the violated invariant.");
  }
  if (defect.repairUnitIds.length === 0) {
    errors.push("repairUnitIds must identify the repair unit.");
  }

  return errors;
}
