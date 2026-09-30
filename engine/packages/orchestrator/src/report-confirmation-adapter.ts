import {
  confirmDefectForReport,
  type DefectConfirmationDecision,
} from "../../bug-report/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  GameplayIntentRuntimeAssessment,
} from "./gameplay-intent-runtime-stage.js";

function authoredInvariantEvidence(
  intent: GameplayIntentModel,
  invariantIds: readonly string[],
): readonly string[] {
  const ids = new Set(invariantIds);
  return intent.invariants
    .filter((invariant) =>
      ids.has(invariant.id) &&
      invariant.status === "authored"
    )
    .flatMap((invariant) => invariant.evidenceIds);
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

  const authoredEvidence = authoredInvariantEvidence(
    intent,
    assessment.result.basisInvariantIds,
  );

  if (authoredEvidence.length === 0) {
    return {
      confirmed: false,
      reasons: [
        "Confirmed-defect disposition has no authored invariant evidence and cannot be promoted safely.",
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
    expectedBehaviorAuthority: "authored-intent",
    runtimeMismatchObserved: true,
    evidence:
      "Runtime evidence " +
      runtimeEvidence.join(", ") +
      " contradicts authored intent evidence " +
      authoredEvidence.join(", ") +
      ".",
  });
}
