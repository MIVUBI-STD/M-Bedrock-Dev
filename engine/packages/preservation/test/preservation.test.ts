import { describe, expect, it } from "vitest";
import type {
  InvariantRegistrySnapshot,
} from "../../project-model/src/index.js";
import {
  evaluatePreservationReadiness,
  validateRepairPreservationContract,
  type RepairPreservationBaseline,
  type RepairPreservationContract,
} from "../src/index.js";

const contract: RepairPreservationContract = {
  schemaVersion: 1,
  id: "preserve:tx-1",
  transactionId: "tx-1",
  mustChangeInvariantIds: ["inv:broken"],
  mustPreserveInvariantIds: ["inv:healthy"],
};

const baseline: RepairPreservationBaseline = {
  schemaVersion: 1,
  contractId: contract.id,
  sourceFingerprint: "source-a",
  targetProfileFingerprint: "profile-a",
  invariantResults: [{
    invariantId: "inv:broken",
    state: "violated",
    evidenceIds: ["before:broken"],
  }, {
    invariantId: "inv:healthy",
    state: "satisfied",
    evidenceIds: ["before:healthy"],
  }],
};

const registry: InvariantRegistrySnapshot = {
  schemaVersion: 1,
  revision: "r1",
  profileKey: "profile-a",
  entries: [{
    id: "inv:broken",
    source: {
      kind: "manual-policy",
      id: "broken",
      revision: "1",
    },
    enforcement: "runtime-state",
    minimumRepairClaim: "proven-runtime",
    stateRequirements: [{
      id: "broken-fixed",
      predicate: "broken-fixed",
      expectedState: "present",
    }],
    temporalRequirements: [],
    revalidationLayers: ["runtime"],
  }, {
    id: "inv:healthy",
    source: {
      kind: "manual-policy",
      id: "healthy",
      revision: "1",
    },
    enforcement: "runtime-state",
    minimumRepairClaim: "proven-runtime",
    stateRequirements: [{
      id: "healthy-remains",
      predicate: "healthy",
      expectedState: "present",
    }],
    temporalRequirements: [],
    revalidationLayers: ["runtime"],
  }],
};

describe("preservation contract", () => {
  it("requires distinct must-change and must-preserve invariants", () => {
    expect(validateRepairPreservationContract({
      ...contract,
      mustPreserveInvariantIds: ["inv:broken"],
    }).join(" ")).toMatch(/both must-change and must-preserve/);
  });

  it("is ready only when the broken baseline is proven and known-good behavior is proven healthy", () => {
    expect(evaluatePreservationReadiness({
      contract,
      baseline,
      invariantRegistry: registry,
      currentSourceFingerprint: "source-a",
      expectedTargetProfileFingerprint: "profile-a",
    })).toMatchObject({
      disposition: "ready",
      baselineEvidenceIds: [
        "before:broken",
        "before:healthy",
      ],
    });
  });

  it("fails closed when a must-preserve baseline is unknown", () => {
    const result = evaluatePreservationReadiness({
      contract,
      baseline: {
        ...baseline,
        invariantResults: baseline.invariantResults.map((item) =>
          item.invariantId === "inv:healthy"
            ? { ...item, state: "unknown" as const, evidenceIds: [] }
            : item
        ),
      },
      invariantRegistry: registry,
      currentSourceFingerprint: "source-a",
    });

    expect(result.disposition).toBe("blocked");
    expect(result.reasons.join(" ")).toMatch(/proven healthy/);
  });
});
