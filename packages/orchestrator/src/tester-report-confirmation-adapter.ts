import {
  confirmDefectForReport,
  type DefectConfirmationDecision,
  type ExpectedBehaviorAuthority,
} from "../../bug-report/src/index.js";

export interface TesterDefectConfirmationInput {
  readonly expectedBehaviorAuthority: ExpectedBehaviorAuthority;
  readonly reproduced: boolean;
  readonly evidence: string;
}

export function confirmTesterDefectForReport(
  input: TesterDefectConfirmationInput,
): DefectConfirmationDecision {
  return confirmDefectForReport({
    foundBy: "tester",
    expectedBehaviorAuthority:
      input.expectedBehaviorAuthority,
    testerReproduced: input.reproduced,
    evidence: input.evidence,
  });
}
