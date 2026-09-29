import {
  confirmDefectForReport,
  type DefectConfirmationDecision,
  type ExpectedBehaviorAuthority,
} from "../../bug-report/src/index.js";

export interface TesterDefectConfirmationInput {
  readonly expectedBehaviorAuthority: ExpectedBehaviorAuthority;
  readonly expectedStatement: string;
  readonly expectedEvidenceIds: readonly string[];
  readonly observationEvidenceIds: readonly string[];
  readonly reproduced: boolean;
  readonly evidence: string;
}

export function confirmTesterDefectForReport(
  input: TesterDefectConfirmationInput,
): DefectConfirmationDecision {
  const reasons: string[] = [];
  if (!input.expectedStatement.trim()) {
    reasons.push(
      "Tester confirmation requires an expected behavior statement.",
    );
  }
  if (input.expectedEvidenceIds.length === 0) {
    reasons.push(
      "Tester confirmation requires evidence identifying the expected behavior authority.",
    );
  }
  if (input.observationEvidenceIds.length === 0) {
    reasons.push(
      "Tester confirmation requires gameplay observation evidence.",
    );
  }
  if (reasons.length > 0) {
    return {
      confirmed: false,
      reasons,
    };
  }

  return confirmDefectForReport({
    foundBy: "tester",
    expectedBehaviorAuthority:
      input.expectedBehaviorAuthority,
    testerReproduced: input.reproduced,
    evidence: input.evidence,
  });
}
