import {
  confirmDefectForReport,
  type DefectConfirmationDecision,
} from "../../../bug-report/src/index.js";
import type {
  IntentDiagnosticGateResult,
} from "../../../diagnostic-reasoning/src/index.js";
import {
  selectedArtifactGameplayContractEvidenceIds,
  type GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";

function selectedArtifactInvariantEvidence(
  intent: GameplayIntentModel,
  invariantIds: readonly string[],
): readonly string[] {
  return selectedArtifactGameplayContractEvidenceIds(
    intent,
    invariantIds,
  );
}
export function confirmStaticIntentDefectForReport(
  intent: GameplayIntentModel,
  result: IntentDiagnosticGateResult,
): DefectConfirmationDecision {
  if (result.disposition !== "confirmed-defect") {
    return {
      confirmed: false,
      reasons: [
        "Intent diagnostic result is " +
          result.disposition +
          ", not confirmed-defect.",
        ...result.reasons,
      ],
    };
  }

  const selectedArtifactEvidence = selectedArtifactInvariantEvidence(
    intent,
    result.basisInvariantIds,
  );
  const expectedEvidence = [
    ...selectedArtifactEvidence,
  ];

  if (expectedEvidence.length === 0) {
    return {
      confirmed: false,
      reasons: [
        "Confirmed-defect disposition has no selected-artifact Gameplay Contract evidence and cannot be promoted.",
      ],
    };
  }

  const expectedEvidenceSet = new Set(expectedEvidence);
  const contradictionEvidence = result.evidenceIds.filter(
    (id) =>
      id.trim().length > 0 &&
      !expectedEvidenceSet.has(id),
  );

  if (contradictionEvidence.length === 0) {
    return {
      confirmed: false,
      reasons: [
        "Static defect confirmation requires contradiction evidence.",
      ],
    };
  }

  return confirmDefectForReport({
    foundBy: "ai",
    expectedBehaviorAuthority: "selected-artifact",
    authoredContractViolation: true,
    evidence:
      "Static evidence " +
      contradictionEvidence.join(", ") +
      " contradicts selected-artifact contract evidence " +
      expectedEvidence.join(", ") +
      ".",
  });
}
