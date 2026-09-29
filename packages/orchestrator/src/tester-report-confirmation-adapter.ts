import {
  confirmDefectForReport,
  type DefectConfirmationDecision,
  type ExpectedBehaviorAuthority,
} from "../../bug-report/src/index.js";

export interface TesterDefectConfirmationInput {
  readonly expectedBehaviorAuthority: ExpectedBehaviorAuthority;
  readonly expectedEvidenceIds: readonly string[];
  readonly reproduced: boolean;
  readonly evidence: string;
}

export function confirmTesterDefectForReport(
  input: TesterDefectConfirmationInput,
): DefectConfirmationDecision {
  if (input.expectedEvidenceIds.length === 0) {
    return {
      confirmed: false,
      reasons: [
        "Tester confirmation requires evidence identifying the expected behavior authority.",
      ],
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
