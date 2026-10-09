import {
  confirmDefectForReport,
  type DefectConfirmationDecision,
} from "../../../bug-report/src/index.js";
import {
  selectedArtifactGameplayContractEvidenceIds,
  type GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import type {
  GameplayIntentRuntimeAssessment,
} from "../inspection/gameplay-intent-runtime-stage.js";

function selectedArtifactInvariantEvidence(
  intent: GameplayIntentModel,
  invariantIds: readonly string[],
): readonly string[] {
  return selectedArtifactGameplayContractEvidenceIds(
    intent,
    invariantIds,
  );
}
export function confirmGameplayIntentRuntimeDefectForReport(
  intent: GameplayIntentModel,
  assessment: GameplayIntentRuntimeAssessment,
): DefectConfirmationDecision {
  if (assessment.result.disposition !== "confirmed-defect") {
    return {
      confirmed: false,
      reasons: [
        "Gameplay intent runtime assessment is " +
          assessment.result.disposition +
          ", not confirmed-defect.",
        ...assessment.result.reasons,
      ],
    };
  }

  const selectedArtifactEvidence = selectedArtifactInvariantEvidence(
    intent,
    assessment.result.basisInvariantIds,
  );

  if (selectedArtifactEvidence.length === 0) {
    return {
      confirmed: false,
      reasons: [
        "Confirmed-defect disposition has no selected-artifact Gameplay Contract evidence and cannot be promoted safely.",
      ],
    };
  }

  const runtimeEvidence = [
    assessment.outcomeObservation.evidenceId,
    ...assessment.result.evidenceIds,
  ].filter(
    (value, index, values) =>
      value.trim().length > 0 &&
      values.indexOf(value) === index,
  );

  return confirmDefectForReport({
    foundBy: "ai",
    expectedBehaviorAuthority: "selected-artifact",
    runtimeMismatchObserved: true,
    evidence:
      "Runtime evidence " +
      runtimeEvidence.join(", ") +
      " contradicts selected-artifact contract evidence " +
      selectedArtifactEvidence.join(", ") +
      ".",
  });
}
