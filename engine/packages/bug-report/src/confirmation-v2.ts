import type {
  BugReportV2FoundBy,
} from "./v2.js";
import type {
  DefectConfirmation,
} from "./promote-v2.js";
import type {
  IntentAdjudicationDisposition,
} from "../../game-design-spec/src/index.js";

export type ExpectedBehaviorAuthority =
  | "authored-intent"
  | "explicit-requirement"
  | "runtime-contract";

export interface DefectConfirmationAssessment {
  readonly foundBy: BugReportV2FoundBy;
  readonly expectedBehaviorAuthority: ExpectedBehaviorAuthority;
  readonly intentDisposition?: IntentAdjudicationDisposition;
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
  const expectedAuthority =
    assessment.expectedBehaviorAuthority;

  if (
    assessment.intentDisposition !== undefined &&
    assessment.intentDisposition !== "suspected-defect"
  ) {
    return {
      confirmed: false,
      reasons: [
        assessment.intentDisposition === "working-as-designed"
          ? "Observed behavior is working as designed and must not be promoted as a bug."
          : assessment.intentDisposition === "design-review"
            ? "The concern is a design/UX review item, not an implementation defect."
            : "Expected behavior is not authoritative enough to confirm a defect.",
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
        "Runtime behavior directly contradicts expected behavior established by " +
          expectedAuthority +
          ".",
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
        "Static source evidence directly contradicts expected behavior established by " +
          expectedAuthority +
          ".",
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
        "Tester reproduction directly demonstrates a mismatch against expected behavior established by " +
          expectedAuthority +
          ".",
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
