import { describe, expect, it } from "vitest";
import {
  markRepairPackageVerified,
  markRepairPreservationVerified,
  markRepairRuntimeVerified,
  markRepairTransitiveRevalidated,
  repairLifecycleFromApplyResult,
  repairReleaseEligible,
  type RepairLifecycleState,
} from "../../src/repair/repair-lifecycle.js";
import type { RepairProofBundle } from "../../src/repair/repair-proof-bundle.js";

const proof: RepairProofBundle = {
  transactionId: "tx-1",
  sourceFingerprint: "source",
  graphFingerprint: "graph",
  decisionBasis: {
    sourceFingerprint: "source",
    graphFingerprint: "graph",
  },
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
    preservationVerificationComplete: false,
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
    expect(repairReleaseEligible(state)).toBe(false);

    state = markRepairPreservationVerified(state, {
      contractId: "preserve:tx-1",
      transactionId: "tx-1",
      passed: true,
      verifiedMustChangeInvariantIds: ["inv:fixed"],
      verifiedMustPreserveInvariantIds: ["inv:healthy"],
      evidenceIds: ["preservation:pass"],
    });
    expect(repairReleaseEligible(state)).toBe(true);
  });

  it("retains the executed runtime experiment contract in lifecycle state", () => {
    const state = markRepairRuntimeVerified(
      staticValidated(),
      {
        transactionId: "tx-1",
        kind: "runtime",
        passed: true,
        evidenceIds: ["runtime:pass"],
        runtimeExperimentContract: {
          interventionId: "exp:chunk",
          experimentRevision: "rev-2",
          compatibleWithRevisions: ["rev-1"],
          targetProfileFingerprint: "profile-a",
          fixtureFingerprint: "fixture-a",
          predicateIds: ["target-ready"],
          factorContrasts: [{
            factorId: "chunk-loaded",
            controlValue: false,
            treatmentValue: true,
          }],
          expectedContrasts: [{
            predicateId: "target-ready",
            controlState: "absent",
            treatmentState: "present",
          }],
        },
      },
    );

    expect(state.runtimeVerificationContract).toMatchObject({
      interventionId: "exp:chunk",
      experimentRevision: "rev-2",
      compatibleWithRevisions: ["rev-1"],
    });
  });

  it("enforces repair-authorizing experiment contract continuity inside lifecycle", () => {
    const authorized = repairLifecycleFromApplyResult({
      status: "validated",
      proof: {
        ...proof,
        causalInterventionProvenance: [{
          interventionId: "exp:chunk",
          experimentRevision: "rev-1",
          predicateId: "target-ready",
          controlledFactorIds: ["chunk-loaded"],
          controlledFactorContrasts: [{
            factorId: "chunk-loaded",
            controlValue: false,
            treatmentValue: true,
          }],
          controlState: "absent",
          treatmentState: "present",
          expectedContrastDisposition: "matched",
          targetProfileFingerprint: "profile-a",
          fixtureFingerprint: "fixture-a",
          evidenceIds: ["e:1"],
        }],
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
    });

    expect(
      authorized.authorizingRuntimeExperimentContracts?.[0],
    ).toMatchObject({
      interventionId: "exp:chunk",
      experimentRevision: "rev-1",
    });

    expect(() => markRepairRuntimeVerified(
      authorized,
      {
        transactionId: "tx-1",
        kind: "runtime",
        passed: true,
        evidenceIds: ["runtime:pass"],
        runtimeExperimentContract: {
          interventionId: "exp:chunk",
          experimentRevision: "rev-2",
          targetProfileFingerprint: "profile-a",
          fixtureFingerprint: "fixture-a",
          predicateIds: ["target-ready"],
          factorContrasts: [{
            factorId: "chunk-loaded",
            controlValue: false,
            treatmentValue: true,
          }],
          expectedContrasts: [{
            predicateId: "target-ready",
            controlState: "absent",
            treatmentState: "present",
          }],
        },
      },
    )).toThrow(/not compatible/i);

    const verified = markRepairRuntimeVerified(
      authorized,
      {
        transactionId: "tx-1",
        kind: "runtime",
        passed: true,
        evidenceIds: ["runtime:pass"],
        runtimeExperimentContract: {
          interventionId: "exp:chunk",
          experimentRevision: "rev-2",
          compatibleWithRevisions: ["rev-1"],
          targetProfileFingerprint: "profile-a",
          fixtureFingerprint: "fixture-a",
          predicateIds: ["target-ready", "extra-check"],
          factorContrasts: [{
            factorId: "chunk-loaded",
            controlValue: false,
            treatmentValue: true,
          }],
          expectedContrasts: [{
            predicateId: "target-ready",
            controlState: "absent",
            treatmentState: "present",
          }, {
            predicateId: "extra-check",
            controlState: "absent",
            treatmentState: "present",
          }],
        },
      },
    );

    expect(verified.runtimeVerificationComplete).toBe(true);
    expect(
      verified.runtimeVerificationContract?.experimentRevision,
    ).toBe("rev-2");
  });

  it("requires complete coverage of every authorizing runtime experiment contract", () => {
    const authorized = repairLifecycleFromApplyResult({
      status: "validated",
      proof: {
        ...proof,
        causalInterventionProvenance: [{
          interventionId: "exp:chunk",
          experimentRevision: "rev-1",
          predicateId: "chunk-ready",
          controlledFactorIds: ["chunk-loaded"],
          controlledFactorContrasts: [{
            factorId: "chunk-loaded",
            controlValue: false,
            treatmentValue: true,
          }],
          controlState: "absent",
          treatmentState: "present",
          expectedContrastDisposition: "matched",
          targetProfileFingerprint: "profile-a",
          fixtureFingerprint: "fixture-a",
          evidenceIds: ["e:chunk"],
        }, {
          interventionId: "exp:reconnect",
          experimentRevision: "rev-1",
          predicateId: "session-restored",
          controlledFactorIds: ["reconnect"],
          controlledFactorContrasts: [{
            factorId: "reconnect",
            controlValue: false,
            treatmentValue: true,
          }],
          controlState: "absent",
          treatmentState: "present",
          expectedContrastDisposition: "matched",
          targetProfileFingerprint: "profile-a",
          fixtureFingerprint: "fixture-b",
          evidenceIds: ["e:reconnect"],
        }],
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
    });

    expect(
      authorized.authorizingRuntimeExperimentContracts,
    ).toHaveLength(2);

    const first = markRepairRuntimeVerified(
      authorized,
      {
        transactionId: "tx-1",
        kind: "runtime",
        passed: true,
        evidenceIds: ["runtime:chunk"],
        runtimeExperimentContract: {
          interventionId: "exp:chunk",
          experimentRevision: "rev-1",
          targetProfileFingerprint: "profile-a",
          fixtureFingerprint: "fixture-a",
          predicateIds: ["chunk-ready"],
          factorContrasts: [{
            factorId: "chunk-loaded",
            controlValue: false,
            treatmentValue: true,
          }],
          expectedContrasts: [{
            predicateId: "chunk-ready",
            controlState: "absent",
            treatmentState: "present",
          }],
        },
      },
    );

    expect(first.runtimeVerificationComplete).toBe(false);
    expect(first.runtimeVerificationContracts).toHaveLength(1);
    expect(first.reasons.at(-1)).toMatch(/1\/2/);

    const second = markRepairRuntimeVerified(
      first,
      {
        transactionId: "tx-1",
        kind: "runtime",
        passed: true,
        evidenceIds: ["runtime:reconnect"],
        runtimeExperimentContract: {
          interventionId: "exp:reconnect",
          experimentRevision: "rev-2",
          compatibleWithRevisions: ["rev-1"],
          targetProfileFingerprint: "profile-a",
          fixtureFingerprint: "fixture-b",
          predicateIds: ["session-restored", "extra-check"],
          factorContrasts: [{
            factorId: "reconnect",
            controlValue: false,
            treatmentValue: true,
          }],
          expectedContrasts: [{
            predicateId: "session-restored",
            controlState: "absent",
            treatmentState: "present",
          }, {
            predicateId: "extra-check",
            controlState: "absent",
            treatmentState: "present",
          }],
        },
      },
    );

    expect(second.runtimeVerificationComplete).toBe(true);
    expect(second.runtimeVerificationContracts).toHaveLength(2);
    expect(second.reasons.at(-1)).toMatch(/2\/2/);
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

  it("advances pending transitive revalidation only with exact proof coverage", () => {
    const pending: RepairLifecycleState = {
      transactionId: "tx-1",
      stage: "transitive-revalidation-pending",
      mutationPresent: true,
      localStaticValidationPassed: true,
      transitiveRevalidationComplete: false,
      runtimeVerificationComplete: false,
      preservationVerificationComplete: false,
      packageVerificationComplete: false,
      pendingNodeIds: ["n2", "n3"],
      pendingPaths: ["functions/b.mcfunction"],
      reasons: [],
    };

    expect(() => markRepairTransitiveRevalidated(pending, {
      transactionId: "tx-1",
      passed: true,
      validatedNodeIds: ["n2"],
      validatedPaths: ["functions/b.mcfunction"],
      evidenceIds: ["static:dependent-pass"],
    })).toThrow(/exactly cover/);

    const completed = markRepairTransitiveRevalidated(pending, {
      transactionId: "tx-1",
      passed: true,
      validatedNodeIds: ["n3", "n2"],
      validatedPaths: ["functions/b.mcfunction"],
      evidenceIds: ["static:dependent-pass"],
    });

    expect(completed.stage).toBe("static-validated");
    expect(completed.transitiveRevalidationComplete).toBe(true);
    expect(completed.pendingNodeIds).toEqual([]);
    expect(completed.pendingPaths).toEqual([]);
  });

  it("rejects failed or cross-transaction transitive revalidation receipts", () => {
    const pending: RepairLifecycleState = {
      transactionId: "tx-1",
      stage: "transitive-revalidation-pending",
      mutationPresent: true,
      localStaticValidationPassed: true,
      transitiveRevalidationComplete: false,
      runtimeVerificationComplete: false,
      preservationVerificationComplete: false,
      packageVerificationComplete: false,
      pendingNodeIds: ["n2"],
      pendingPaths: [],
      reasons: [],
    };

    expect(() => markRepairTransitiveRevalidated(pending, {
      transactionId: "tx-1",
      passed: false,
      validatedNodeIds: ["n2"],
      validatedPaths: [],
      evidenceIds: ["static:failed"],
    })).toThrow(/Failed transitive/);

    expect(() => markRepairTransitiveRevalidated(pending, {
      transactionId: "other",
      passed: true,
      validatedNodeIds: ["n2"],
      validatedPaths: [],
      evidenceIds: ["static:pass"],
    })).toThrow(/another transaction/);
  });

});
