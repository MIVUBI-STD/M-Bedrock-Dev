import {
  decideRepairRelease,
  type RepairReleaseDecision,
} from "./repair-release-gate.js";
import type {
  RepairLifecycleState,
} from "./repair-lifecycle.js";

export interface DefectRegressionReceipt {
  transactionId: string;
  scenarioId: string;
  originalDefectReproduced: boolean;
  evidenceIds: readonly string[];
}

export type PostRepairClosureDisposition =
  | "fixed"
  | "regression"
  | "incomplete";

export interface PostRepairClosureResult {
  transactionId: string;
  disposition: PostRepairClosureDisposition;
  release: RepairReleaseDecision;
  defectRegression: DefectRegressionReceipt;
  reasons: readonly string[];
}

export function evaluatePostRepairClosure(
  state: RepairLifecycleState,
  defectRegression: DefectRegressionReceipt,
): PostRepairClosureResult {
  if (
    defectRegression.transactionId !==
      state.transactionId
  ) {
    throw new Error(
      "Defect regression receipt belongs to another repair transaction.",
    );
  }

  if (
    defectRegression.evidenceIds.length === 0
  ) {
    throw new Error(
      "Defect regression receipt requires explicit evidence ids.",
    );
  }

  const release = decideRepairRelease(state);

  if (defectRegression.originalDefectReproduced) {
    return {
      transactionId: state.transactionId,
      disposition: "regression",
      release: {
        transactionId: state.transactionId,
        disposition: "blocked",
        reasons: [
          "Original defect still reproduces after repair.",
          ...release.reasons,
        ],
      },
      defectRegression,
      reasons: [
        "The original minimal counterexample still reproduces after repair.",
        "Repair cannot be closed or released.",
      ],
    };
  }

  if (
    release.disposition !== "release-eligible"
  ) {
    return {
      transactionId: state.transactionId,
      disposition: "incomplete",
      release,
      defectRegression,
      reasons: [
        "Original defect no longer reproduces, but one or more repair proof layers remain incomplete.",
        ...release.reasons,
      ],
    };
  }

  return {
    transactionId: state.transactionId,
    disposition: "fixed",
    release,
    defectRegression,
    reasons: [
      "Original defect no longer reproduces.",
      "All static, transitive, runtime, preservation, and package proof layers are complete.",
      "Repair is closed and release-eligible.",
    ],
  };
}

export function assertPostRepairFixed(
  result: PostRepairClosureResult,
): void {
  if (result.disposition === "fixed") {
    return;
  }

  throw new Error(
    "Post-repair closure failed: " +
      result.disposition +
      " - " +
      result.reasons.join("; "),
  );
}
