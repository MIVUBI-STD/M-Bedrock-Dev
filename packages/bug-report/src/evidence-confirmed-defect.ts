import {
  confirmDefectForReport,
  type ExpectedBehaviorAuthority,
} from "./confirmation-v2.js";
import {
  deriveConfirmedDefectSemanticKey,
  deriveRepairUnitIdsFromSourceEvidence,
  type ConfirmedDefect,
  type ConfirmedDefectSourceEvidence,
} from "./confirmed-defect.js";
import type {
  BugImpactAssessment,
  BugPrimaryFailure,
} from "./decision.js";
import type {
  BugReportV2FoundBy,
} from "./v2.js";

export interface ConfirmedDefectEvidenceInput {
  subjectIds: readonly string[];
  brokenInvariantIds: readonly string[];
  foundBy: BugReportV2FoundBy;
  expectedBehaviorAuthority: ExpectedBehaviorAuthority;
  expectedStatement: string;
  expectedEvidenceIds: readonly string[];
  observedStatement: string;
  observedEvidenceIds: readonly string[];
  confirmationEvidence: string;
  authoredContractViolation?: boolean;
  runtimeMismatchObserved?: boolean;
  testerReproduced?: boolean;
  compatibilityDifferenceOnly?: boolean;
  impact: BugImpactAssessment;
  primaryFailure: BugPrimaryFailure;
  title: string;
  problem: string;
  sourceEvidence?: readonly ConfirmedDefectSourceEvidence[];
  reproduction?: readonly string[];
  aiAnalysis?: string;
  suggestedFix?: string;
  mustPreserve?: readonly string[];
  causalIncidentId?: string;
}

export function confirmedDefectFromEvidence(
  input: ConfirmedDefectEvidenceInput,
): ConfirmedDefect | undefined {
  const decision = confirmDefectForReport({
    foundBy: input.foundBy,
    expectedBehaviorAuthority:
      input.expectedBehaviorAuthority,
    testerReproduced: input.testerReproduced,
    authoredContractViolation:
      input.authoredContractViolation,
    runtimeMismatchObserved:
      input.runtimeMismatchObserved,
    compatibilityDifferenceOnly:
      input.compatibilityDifferenceOnly,
    evidence: input.confirmationEvidence,
  });

  if (!decision.confirmed) return undefined;

  const identity = {
    subjectIds: input.subjectIds,
    brokenInvariantIds:
      input.brokenInvariantIds,
    primaryFailure: input.primaryFailure,
    ...(input.causalIncidentId === undefined
      ? {}
      : { causalIncidentId: input.causalIncidentId }),
  };

  const repairUnitIds =
    deriveRepairUnitIdsFromSourceEvidence(
      input.sourceEvidence,
    );

  return {
    semanticKey:
      deriveConfirmedDefectSemanticKey(identity),
    subjectIds: input.subjectIds,
    foundBy: input.foundBy,
    confirmation: decision.confirmation,
    impact: input.impact,
    primaryFailure: input.primaryFailure,
    title: input.title,
    problem: input.problem,
    expected: {
      authority:
        input.expectedBehaviorAuthority,
      statement: input.expectedStatement,
      evidenceIds: input.expectedEvidenceIds,
    },
    observed: {
      statement: input.observedStatement,
      evidenceIds: input.observedEvidenceIds,
    },
    ...(input.reproduction === undefined
      ? {}
      : { reproduction: input.reproduction }),
    ...(input.aiAnalysis === undefined
      ? {}
      : { aiAnalysis: input.aiAnalysis }),
    ...(input.sourceEvidence === undefined
      ? {}
      : { sourceEvidence: input.sourceEvidence }),
    ...(input.suggestedFix === undefined
      ? {}
      : { suggestedFix: input.suggestedFix }),
    ...(input.mustPreserve === undefined
      ? {}
      : { mustPreserve: input.mustPreserve }),
    brokenInvariantIds:
      input.brokenInvariantIds,
    repairUnitIds,
    ...(input.causalIncidentId === undefined
      ? {}
      : { causalIncidentId: input.causalIncidentId }),
  };
}
