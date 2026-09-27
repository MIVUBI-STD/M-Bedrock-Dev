import {
  assessGameplayIntentGrounding,
  evaluateGameplayOutcomeAdmissibility,
  type GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  IntentDiagnosticGateResult,
} from "./intent-gate.js";

export interface ObservedOutcomeIntentInput {
  intent: GameplayIntentModel;
  outcomeId: string;
  stateValues: Readonly<Record<string, unknown>>;
  observationEvidenceIds: readonly string[];
}

export function gateObservedOutcomeAgainstIntent(
  input: ObservedOutcomeIntentInput,
): IntentDiagnosticGateResult {
  const grounding = assessGameplayIntentGrounding(
    input.intent,
    [input.outcomeId],
  );

  if (grounding.disposition === "ambiguous") {
    return {
      disposition: "ambiguous-intent",
      subjectIds: [input.outcomeId],
      basisInvariantIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      nextEvidenceNeed: "intent-clarification",
      reasons: grounding.reasons,
    };
  }

  if (grounding.disposition === "insufficient") {
    return {
      disposition: "insufficient-evidence",
      subjectIds: [input.outcomeId],
      basisInvariantIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      nextEvidenceNeed: "intent-grounding",
      reasons: grounding.reasons,
    };
  }

  const assessment = evaluateGameplayOutcomeAdmissibility(
    input.intent,
    input.outcomeId,
    input.stateValues,
  );

  if (assessment.disposition === "admissible") {
    return {
      disposition: "designed-behavior",
      subjectIds: [input.outcomeId],
      basisInvariantIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      nextEvidenceNeed: "none",
      reasons: assessment.reasons,
    };
  }

  if (assessment.disposition === "unknown") {
    return {
      disposition: "insufficient-evidence",
      subjectIds: [input.outcomeId],
      basisInvariantIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      nextEvidenceNeed: "contradiction-proof",
      reasons: assessment.reasons,
    };
  }

  const admissibilityInvariants =
    input.intent.invariants.filter(
      (invariant) =>
        invariant.subjectIds.includes(input.outcomeId) &&
        invariant.id.startsWith("inv:admissible-policy:"),
    );

  return {
    disposition: "probable-defect",
    subjectIds: [input.outcomeId],
    basisInvariantIds:
      admissibilityInvariants.map((item) => item.id),
    evidenceIds: [...input.observationEvidenceIds],
    nextEvidenceNeed: "authored-intent",
    reasons: [
      ...assessment.reasons,
      "The admissibility contract is inferred from complete recognized direct-guard coverage, so this cannot be promoted to confirmed defect without stronger evidence.",
    ],
  };
}
