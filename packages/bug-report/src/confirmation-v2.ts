import type {
  BugReportV2FoundBy,
} from "./v2.js";
import type {
  DefectConfirmation,
} from "./promote-v2.js";

export interface DefectConfirmationAssessment {
  readonly foundBy: BugReportV2FoundBy;
  readonly expectedBehaviorEstablished: boolean;
  readonly testerReproduced?: boolean;
  readonly authoredContractViolation?: boolean;
  readonly runtimeMismatchObserved?: boolean;
  readonly compatibilityDifferenceOnly?: boolean;
  readonly evidence: string;
}

export type DefectConfirmationDecision =
  | {
      readonly confirmed: true;
      readonly confirmation: DefectConfirmation;
      readonly reasons: readonly string[];
    }
  | {
      readonly confirmed: false;
      readonly reasons: readonly string[];
    };

export function confirmDefectForReport(
  assessment: DefectConfirmationAssessment,
): DefectConfirmationDecision {
  const evidence = assessment.evidence.trim();

  if (!assessment.expectedBehaviorEstablished) {
    return {
      confirmed: false,
      reasons: [
        "Expected behavior is not established by authored intent, an explicit requirement, or an applicable runtime contract.",
      ],
    };
  }

  if (assessment.compatibilityDifferenceOnly === true) {
    return {
      confirmed: false,
      reasons: [
        "A Base Version / Tested Version difference alone is context, not proof of a defect.",
      ],
    };
  }

  if (!evidence) {
    return {
      confirmed: false,
      reasons: [
        "Defect confirmation requires a concise evidence statement.",
      ],
    };
  }

  if (assessment.runtimeMismatchObserved === true) {
    return {
      confirmed: true,
      confirmation: {
        basis: "runtime-observation",
        evidence,
      },
      reasons: [
        "Runtime behavior directly contradicts established expected behavior.",
      ],
    };
  }

  if (assessment.authoredContractViolation === true) {
    return {
      confirmed: true,
      confirmation: {
        basis: "authored-contract-violation",
        evidence,
      },
      reasons: [
        "Static source evidence directly contradicts established authored behavior.",
      ],
    };
  }

  if (
    assessment.foundBy === "tester" &&
    assessment.testerReproduced === true
  ) {
    return {
      confirmed: true,
      confirmation: {
        basis: "tester-reproduction",
        evidence,
      },
      reasons: [
        "Tester reproduction directly demonstrates the behavior mismatch.",
      ],
    };
  }

  return {
    confirmed: false,
    reasons: [
      assessment.foundBy === "ai"
        ? "AI discovery requires a proven authored-contract violation or runtime mismatch; risk, correlation, or tester evidence alone is insufficient."
        : "Tester discovery requires a reproducible gameplay mismatch unless stronger static or runtime proof is available.",
    ],
  };
}
