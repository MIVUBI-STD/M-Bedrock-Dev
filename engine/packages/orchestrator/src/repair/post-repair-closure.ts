import {
  decideRepairRelease,
  type RepairReleaseDecision,
} from "../repair/repair-release-gate.js";
import type {
  RepairLifecycleState,
} from "../repair/repair-lifecycle.js";
import type {
  ZeroWasteExecutionReceipt,
} from "../workflow/zero-waste-execution-receipt.js";

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


export interface PostRepairProofLayerEvidence {
  transitive: readonly string[];
  runtime: readonly string[];
  preservation: readonly string[];
  package: readonly string[];
  zeroWaste?: ZeroWasteExecutionReceipt;
}

export interface PostRepairClosureReceipt {
  schemaVersion: 1;
  transactionId: string;
  scenarioId: string;
  disposition: "fixed";
  proofLayerEvidence: PostRepairProofLayerEvidence;
  regressionEvidenceIds: readonly string[];
  zeroWasteExecution?: {
    transactionId: string;
    status: "complete";
    avoidedWork: ZeroWasteExecutionReceipt["avoidedWork"];
    evidenceIds: readonly string[];
  };
  evidenceIds: readonly string[];
}

function requireEvidenceLayer(
  name: keyof PostRepairProofLayerEvidence,
  ids: readonly string[],
): readonly string[] {
  const normalized = [
    ...new Set(
      ids
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ].sort();

  if (normalized.length === 0) {
    throw new Error(
      "Post-repair closure receipt requires " +
        name +
        " evidence.",
    );
  }
  return normalized;
}

export function createPostRepairClosureReceipt(
  result: PostRepairClosureResult,
  evidence: PostRepairProofLayerEvidence,
): PostRepairClosureReceipt {
  if (result.disposition !== "fixed") {
    throw new Error(
      "Post-repair closure receipt can only be created for a fixed repair.",
    );
  }
  if (
    result.release.disposition !==
      "release-eligible"
  ) {
    throw new Error(
      "Post-repair closure receipt requires release eligibility.",
    );
  }

  const proofLayerEvidence = {
    transitive: requireEvidenceLayer(
      "transitive",
      evidence.transitive,
    ),
    runtime: requireEvidenceLayer(
      "runtime",
      evidence.runtime,
    ),
    preservation: requireEvidenceLayer(
      "preservation",
      evidence.preservation,
    ),
    package: requireEvidenceLayer(
      "package",
      evidence.package,
    ),
  };

  let zeroWasteExecution:
    PostRepairClosureReceipt["zeroWasteExecution"];

  if (evidence.zeroWaste !== undefined) {
    if (
      evidence.zeroWaste.transactionId !==
      result.transactionId
    ) {
      throw new Error(
        "Zero-waste execution receipt belongs to another repair transaction.",
      );
    }
    if (
      evidence.zeroWaste.status !==
      "complete"
    ) {
      throw new Error(
        "Post-repair closure requires a complete zero-waste execution receipt when one is supplied.",
      );
    }

    if (
      evidence.zeroWaste
        .dependencyViolations
        .length > 0 ||
      evidence.zeroWaste
        .executionViolations
        .length > 0
    ) {
      throw new Error(
        "Zero-waste execution receipt contains unresolved execution violations.",
      );
    }

    zeroWasteExecution = {
      transactionId:
        evidence.zeroWaste.transactionId,
      status: "complete",
      avoidedWork:
        evidence.zeroWaste.avoidedWork,
      evidenceIds: [
        ...new Set(
          evidence.zeroWaste.evidenceIds,
        ),
      ].sort(),
    };
  }

  const regressionEvidenceIds = [
    ...new Set(
      result.defectRegression.evidenceIds,
    ),
  ].sort();

  if (regressionEvidenceIds.length === 0) {
    throw new Error(
      "Post-repair closure receipt requires defect regression evidence.",
    );
  }

  const evidenceIds = [
    ...new Set([
      ...proofLayerEvidence.transitive,
      ...proofLayerEvidence.runtime,
      ...proofLayerEvidence.preservation,
      ...proofLayerEvidence.package,
      ...regressionEvidenceIds,
      ...(zeroWasteExecution?.evidenceIds ?? []),
    ]),
  ].sort();

  return {
    schemaVersion: 1,
    transactionId: result.transactionId,
    scenarioId:
      result.defectRegression.scenarioId,
    disposition: "fixed",
    proofLayerEvidence,
    regressionEvidenceIds,
    ...(zeroWasteExecution === undefined
      ? {}
      : { zeroWasteExecution }),
    evidenceIds,
  };
}
