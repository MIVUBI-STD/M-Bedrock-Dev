import {
  confirmDefectForReport,
  type DefectConfirmationDecision,
} from "../../bug-report/src/index.js";
import type {
  IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";

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

  const authoredEvidence = authoredInvariantEvidence(
    intent,
    result.basisInvariantIds,
  );

  if (authoredEvidence.length === 0) {
    return {
      confirmed: false,
      reasons: [
        "Confirmed-defect disposition has no authored invariant evidence and cannot be promoted as a static contract violation.",
      ],
    };
  }

  const contradictionEvidence = result.evidenceIds.filter(
    (id) => id.trim().length > 0,
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
    expectedBehaviorAuthority: "authored-intent",
    authoredContractViolation: true,
    evidence:
      "Static evidence " +
      contradictionEvidence.join(", ") +
      " contradicts authored intent evidence " +
      authoredEvidence.join(", ") +
      ".",
  });
}
