import { describe, expect, it } from "vitest";
import type {
  InvariantRegistrySnapshot,
  RuntimeEvidenceRecord,
} from "../../project-model/src/index.js";
import type {
  RepairPreservationContract,
} from "../../preservation/src/index.js";
import {
  verifyRepairPreservation,
} from "../src/repair-preservation-verification.js";

const contract: RepairPreservationContract = {
  schemaVersion: 1,
  id: "preserve:tx-1",
  transactionId: "tx-1",
  mustChangeInvariantIds: ["inv:fixed"],
  mustPreserveInvariantIds: ["inv:healthy"],
  forbiddenSideEffectIds: ["effect:cross-arena-write"],
};

const registry: InvariantRegistrySnapshot = {
  schemaVersion: 1,
  revision: "inv-r1",
  profileKey: "profile-a",
  entries: [{
    id: "inv:fixed",
    source: { kind: "manual-policy", id: "fixed", revision: "1" },
    enforcement: "runtime-state",
    minimumRepairClaim: "proven-runtime",
    stateRequirements: [{
      id: "fixed",
      predicate: "bug-fixed",
      expectedState: "present",
    }],
    temporalRequirements: [],
    revalidationLayers: ["runtime"],
  }, {
    id: "inv:healthy",
    source: { kind: "manual-policy", id: "healthy", revision: "1" },
    enforcement: "runtime-state",
    minimumRepairClaim: "proven-runtime",
    stateRequirements: [{
      id: "healthy",
      predicate: "healthy-still-works",
      expectedState: "present",
    }],
    temporalRequirements: [],
    revalidationLayers: ["runtime"],
  }],
};

const records: RuntimeEvidenceRecord[] = [{
  predicate: "bug-fixed",
  state: "present",
  confidence: "observed",
  targetProfileFingerprint: "profile-a",
  observedAt: { tick: 10 },
}, {
  predicate: "healthy-still-works",
  state: "present",
  confidence: "observed",
  targetProfileFingerprint: "profile-a",
  observedAt: { tick: 11 },
}];

describe("repair preservation verification", () => {
  it("passes only when fixed and preserved invariants both hold after repair", () => {
    const result = verifyRepairPreservation({
      contract,
      invariantRegistry: registry,
      runtimeEvidence: records,
      expectedTargetProfileFingerprint: "profile-a",
      observedSideEffectIds: [],
      sideEffectObservationComplete: true,
    });

    expect(result.passed).toBe(true);
    expect(result.receipt).toMatchObject({
      contractId: contract.id,
      transactionId: "tx-1",
      verifiedMustChangeInvariantIds: ["inv:fixed"],
      verifiedMustPreserveInvariantIds: ["inv:healthy"],
    });
  });

  it("fails closed when target-bound preservation evidence is missing", () => {
    const result = verifyRepairPreservation({
      contract,
      invariantRegistry: registry,
      runtimeEvidence: records.map((record) => ({
        ...record,
        targetProfileFingerprint: "profile-b",
      })),
      expectedTargetProfileFingerprint: "profile-a",
      observedSideEffectIds: [],
      sideEffectObservationComplete: true,
    });

    expect(result.passed).toBe(false);
    expect(result.failedInvariantIds).toEqual([
      "inv:fixed",
      "inv:healthy",
    ]);
  });

  it("fails when a forbidden side effect is observed", () => {
    const result = verifyRepairPreservation({
      contract,
      invariantRegistry: registry,
      runtimeEvidence: records,
      expectedTargetProfileFingerprint: "profile-a",
      observedSideEffectIds: ["effect:cross-arena-write"],
      sideEffectObservationComplete: true,
    });

    expect(result.passed).toBe(false);
    expect(result.reasons.join(" ")).toMatch(/Forbidden side effect/);
  });
});
