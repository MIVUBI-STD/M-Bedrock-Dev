import { describe, expect, it } from "vitest";
import {
  markRepairPackageVerified,
  markRepairRuntimeVerified,
  repairLifecycleFromApplyResult,
  repairReleaseEligible,
  type RepairLifecycleState,
} from "../src/repair-lifecycle.js";
import type { RepairProofBundle } from "../src/repair-proof-bundle.js";

const proof: RepairProofBundle = {
  transactionId: "tx-1",
  sourceFingerprint: "source",
  graphFingerprint: "graph",
  incidentId: "incident-1",
  selectedCandidateId: "candidate",
  diagnosticDisposition: "repair-eligible",
  claimStrength: "proven-runtime",
  effectiveEvidenceLevel: "proven-with-observed-outcome",
  blastRadiusDisposition: "minimal",
  admissionDisposition: "eligible",
  supportingInvariantIds: [],
  changedNodeIds: ["n1"],
  affectedNodeIds: ["n1"],
  requiredRevalidationNodeIds: [],
  requiredRevalidationPaths: [],
  impactTraces: [],
  reasons: [],
};

function staticValidated(): RepairLifecycleState {
  return {
    transactionId: "tx-1",
    stage: "static-validated",
    mutationPresent: true,
    localStaticValidationPassed: true,
    transitiveRevalidationComplete: true,
    runtimeVerificationComplete: false,
    packageVerificationComplete: false,
    pendingNodeIds: [],
    pendingPaths: [],
    reasons: [],
  };
}

describe("repair lifecycle", () => {
  it("keeps transitive revalidation pending non-releaseable", () => {
    const state = repairLifecycleFromApplyResult({
      status: "transitive-revalidation-pending",
      proof: {
        ...proof,
        requiredRevalidationNodeIds: ["n2"],
        requiredRevalidationPaths: ["functions/caller.mcfunction"],
      },
      apply: {
        ok: true,
        appliedOperations: 1,
        rollback: [],
      },
      validation: {
        ok: true,
        steps: [],
      },
      pendingNodeIds: ["n2"],
      pendingPaths: ["functions/caller.mcfunction"],
    });

    expect(state.stage).toBe("transitive-revalidation-pending");
    expect(repairReleaseEligible(state)).toBe(false);
  });

  it("requires explicit evidence receipts for runtime and package proof", () => {
    let state = staticValidated();
    expect(repairReleaseEligible(state)).toBe(false);

    state = markRepairPackageVerified(state, {
      transactionId: "tx-1",
      kind: "package",
      passed: true,
      evidenceIds: ["package:deterministic-output"],
    });
    expect(repairReleaseEligible(state)).toBe(false);

    state = markRepairRuntimeVerified(state, {
      transactionId: "tx-1",
      kind: "runtime",
      passed: true,
      evidenceIds: ["runtime:invariant-pass"],
    });
    expect(repairReleaseEligible(state)).toBe(true);
  });

  it("rejects empty, failed, or cross-transaction verification receipts", () => {
    const state = staticValidated();

    expect(() => markRepairRuntimeVerified(state, {
      transactionId: "tx-1",
      kind: "runtime",
      passed: true,
      evidenceIds: [],
    })).toThrow(/evidence ids/);

    expect(() => markRepairRuntimeVerified(state, {
      transactionId: "tx-1",
      kind: "runtime",
      passed: false,
      evidenceIds: ["runtime:failed"],
    })).toThrow(/Failed verification/);

    expect(() => markRepairPackageVerified(state, {
      transactionId: "other",
      kind: "package",
      passed: true,
      evidenceIds: ["package:pass"],
    })).toThrow(/another transaction/);
  });

  it("records rolled-back validation failure without retaining mutation", () => {
    const state = repairLifecycleFromApplyResult({
      status: "static-validation-failed",
      proof,
      apply: {
        ok: true,
        appliedOperations: 1,
        rollback: [],
      },
      validation: {
        ok: false,
        steps: [],
      },
      rollback: {
        ok: true,
        restoredFiles: 1,
      },
    });

    expect(state.stage).toBe("rolled-back-after-validation-failure");
    expect(state.mutationPresent).toBe(false);
    expect(repairReleaseEligible(state)).toBe(false);
  });
});
