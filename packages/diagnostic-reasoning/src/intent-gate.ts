import {
  assessGameplayIntentGrounding,
  type GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";

export type IntentDiagnosticDisposition =
  | "confirmed-defect"
  | "probable-defect"
  | "designed-behavior"
  | "engine-constraint"
  | "compatibility-difference"
  | "insufficient-evidence"
  | "ambiguous-intent"
  | "runtime-proof-required";

export interface IntentDiagnosticGateInput {
  intent: GameplayIntentModel;
  subjectIds: readonly string[];
  observationEvidenceIds: readonly string[];
  contradictionEvidenceIds?: readonly string[];
  designMatchEvidenceIds?: readonly string[];
  engineConstraintEvidenceIds?: readonly string[];
  compatibilityDifferenceEvidenceIds?: readonly string[];
  runtimeProofRequired?: boolean;
  runtimeProofEvidenceIds?: readonly string[];
}

export interface IntentDiagnosticGateResult {
  disposition: IntentDiagnosticDisposition;
  subjectIds: readonly string[];
  basisInvariantIds: readonly string[];
  evidenceIds: readonly string[];
  reasons: readonly string[];
}

export function gateIntentDiagnostic(
  input: IntentDiagnosticGateInput,
): IntentDiagnosticGateResult {
  const grounding = assessGameplayIntentGrounding(
    input.intent,
    input.subjectIds,
  );

  if (grounding.disposition === "insufficient") {
    return {
      disposition: "insufficient-evidence",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      reasons: grounding.reasons,
    };
  }

  if (grounding.disposition === "ambiguous") {
    return {
      disposition: "ambiguous-intent",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      reasons: grounding.reasons,
    };
  }

  if (
    (input.compatibilityDifferenceEvidenceIds?.length ?? 0) > 0
  ) {
    return {
      disposition: "compatibility-difference",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.compatibilityDifferenceEvidenceIds ?? []),
      ],
      reasons: [
        "Observed behavior is explained by an evidenced target compatibility difference.",
      ],
    };
  }

  if ((input.engineConstraintEvidenceIds?.length ?? 0) > 0) {
    return {
      disposition: "engine-constraint",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.engineConstraintEvidenceIds ?? []),
      ],
      reasons: [
        "Observed behavior is explained by an evidenced engine constraint.",
      ],
    };
  }

  if ((input.designMatchEvidenceIds?.length ?? 0) > 0) {
    return {
      disposition: "designed-behavior",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.designMatchEvidenceIds ?? []),
      ],
      reasons: [
        "Observed behavior has direct evidence matching the authored or inferred design.",
      ],
    };
  }

  if (
    input.runtimeProofRequired === true &&
    (input.runtimeProofEvidenceIds?.length ?? 0) === 0
  ) {
    return {
      disposition: "runtime-proof-required",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: [],
      evidenceIds: [...input.observationEvidenceIds],
      reasons: [
        "This behavior depends on runtime semantics that static evidence cannot prove.",
      ],
    };
  }

  const applicable = input.intent.invariants.filter((invariant) =>
    invariant.subjectIds.some((subjectId) =>
      input.subjectIds.includes(subjectId),
    ),
  );

  const authored = applicable.filter(
    (invariant) => invariant.status === "authored",
  );
  const inferred = applicable.filter(
    (invariant) => invariant.status === "inferred",
  );

  if (
    input.observationEvidenceIds.length > 0 &&
    (input.contradictionEvidenceIds?.length ?? 0) > 0 &&
    authored.length > 0
  ) {
    return {
      disposition: "confirmed-defect",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: authored.map((item) => item.id),
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.contradictionEvidenceIds ?? []),
        ...(input.runtimeProofEvidenceIds ?? []),
      ],
      reasons: [
        "Observed evidence contradicts an evidence-grounded authored invariant.",
      ],
    };
  }

  if (
    input.observationEvidenceIds.length > 0 &&
    (input.contradictionEvidenceIds?.length ?? 0) > 0 &&
    inferred.length > 0
  ) {
    return {
      disposition: "probable-defect",
      subjectIds: [...input.subjectIds],
      basisInvariantIds: inferred.map((item) => item.id),
      evidenceIds: [
        ...input.observationEvidenceIds,
        ...(input.contradictionEvidenceIds ?? []),
        ...(input.runtimeProofEvidenceIds ?? []),
      ],
      reasons: [
        "Observed evidence contradicts inferred intent, but authored intent is not yet strong enough for confirmation.",
      ],
    };
  }

  return {
    disposition: "insufficient-evidence",
    subjectIds: [...input.subjectIds],
    basisInvariantIds: applicable.map((item) => item.id),
    evidenceIds: [
      ...input.observationEvidenceIds,
      ...(input.runtimeProofEvidenceIds ?? []),
    ],
    reasons: [
      "No evidenced contradiction or design match is strong enough to classify the observation.",
    ],
  };
}
