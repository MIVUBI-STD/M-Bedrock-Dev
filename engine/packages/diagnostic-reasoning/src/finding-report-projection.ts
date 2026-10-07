import type {
  IntentDiagnosticDisposition,
} from "./intent-gate.js";
import type {
  CrossDomainConfidence,
  CrossDomainHypothesisAssessment,
} from "./cross-domain-reasoning.js";

export type FindingReportClassification =
  | "PROVEN BUG"
  | "LIKELY BUG"
  | "RISK"
  | "DESIGN MISMATCH"
  | "UNKNOWN"
  | "EXPECTED";

export interface FindingReportProjection {
  reportClassification: FindingReportClassification;
  diagnosticDisposition: IntentDiagnosticDisposition;
  proofConfidence: CrossDomainConfidence;
  reasons: readonly string[];
}

export function projectFindingClassification(
  disposition: IntentDiagnosticDisposition,
  assessment: Pick<
    CrossDomainHypothesisAssessment,
    "confidence" | "disposition" | "missingRequiredPredicates"
  >,
): FindingReportProjection {
  const base = {
    diagnosticDisposition: disposition,
    proofConfidence: assessment.confidence,
  } as const;

  if (disposition === "confirmed-defect") {
    const proven =
      assessment.confidence === "proven" &&
      assessment.disposition === "supported" &&
      assessment.missingRequiredPredicates.length === 0;
    return {
      ...base,
      reportClassification: proven ? "PROVEN BUG" : "LIKELY BUG",
      reasons: [
        proven
          ? "Confirmed defect is fully supported by the current cross-domain proof chain."
          : "Defect authority exists, but the cross-domain proof chain has not reached the proven threshold.",
      ],
    };
  }

  if (disposition === "designed-behavior") {
    return {
      ...base,
      reportClassification: "EXPECTED",
      reasons: ["Observed behavior matches grounded gameplay intent."],
    };
  }

  if (disposition === "design-review") {
    return {
      ...base,
      reportClassification: "DESIGN MISMATCH",
      reasons: ["Behavior requires design review rather than automatic defect repair."],
    };
  }

  if (
    disposition === "engine-constraint" ||
    disposition === "compatibility-difference"
  ) {
    return {
      ...base,
      reportClassification: "RISK",
      reasons: [
        disposition === "engine-constraint"
          ? "Evidence points to an engine constraint, not an implementation defect."
          : "Evidence points to a compatibility difference, not an implementation defect.",
      ],
    };
  }

  return {
    ...base,
    reportClassification: "UNKNOWN",
    reasons: [
      disposition === "runtime-proof-required"
        ? "Runtime proof is still required."
        : disposition === "ambiguous-intent"
          ? "Gameplay intent is not grounded enough to classify a defect."
          : "Evidence is insufficient for a stronger classification.",
    ],
  };
}
