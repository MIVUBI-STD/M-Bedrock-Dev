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
  classification: FindingReportClassification;
  authoritativeDisposition: IntentDiagnosticDisposition;
  confidence: CrossDomainConfidence;
  repairEligibleByClassification: boolean;
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
    authoritativeDisposition: disposition,
    confidence: assessment.confidence,
  } as const;

  if (disposition === "confirmed-defect") {
    const proven =
      assessment.confidence === "proven" &&
      assessment.disposition === "supported" &&
      assessment.missingRequiredPredicates.length === 0;
    return {
      ...base,
      classification: proven ? "PROVEN BUG" : "LIKELY BUG",
      repairEligibleByClassification: proven,
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
      classification: "EXPECTED",
      repairEligibleByClassification: false,
      reasons: ["Observed behavior matches grounded gameplay intent."],
    };
  }

  if (disposition === "design-review") {
    return {
      ...base,
      classification: "DESIGN MISMATCH",
      repairEligibleByClassification: false,
      reasons: ["Behavior requires design review rather than automatic defect repair."],
    };
  }

  if (
    disposition === "engine-constraint" ||
    disposition === "compatibility-difference"
  ) {
    return {
      ...base,
      classification: "RISK",
      repairEligibleByClassification: false,
      reasons: [
        disposition === "engine-constraint"
          ? "Evidence points to an engine constraint, not an implementation defect."
          : "Evidence points to a compatibility difference, not an implementation defect.",
      ],
    };
  }

  return {
    ...base,
    classification: "UNKNOWN",
    repairEligibleByClassification: false,
    reasons: [
      disposition === "runtime-proof-required"
        ? "Runtime proof is still required."
        : disposition === "ambiguous-intent"
          ? "Gameplay intent is not grounded enough to classify a defect."
          : "Evidence is insufficient for a stronger classification.",
    ],
  };
}
