import { describe, expect, it } from "vitest";
import { createPatchTransaction } from "../../repair/src/create.js";
import { decideRepairAdmission } from "../src/repair-admission.js";

const transaction = createPatchTransaction({
  title: "demo",
  sourceFingerprint: "abc",
  operations: [{
    kind: "replace-text",
    source: { artifactId: "art-1", relativePath: "a.mcfunction" },
    expected: "a",
    replacement: "b",
  }],
  preconditions: [{
    kind: "source-fingerprint",
    expected: "abc",
  }],
  validation: [],
});

const diagnostic = {
  incidentId: "incident-1",
  activeCandidateIds: ["candidate"],
  disposition: "repair-eligible" as const,
  selectedCandidateId: "candidate",
  effectiveEvidenceLevel: "proven-with-observed-outcome" as const,
  claimStrength: "proven-runtime" as const,
  reasons: ["runtime proof"],
};

describe("repair admission", () => {
  it("admits a proven repair with bounded semantic impact", () => {
    expect(decideRepairAdmission(
      transaction,
      diagnostic,
      {
        transactionId: transaction.id,
        disposition: "bounded",
        affectedNodes: 2,
        affectedPaths: 2,
        affectedKinds: ["function"],
        sensitiveKinds: [],
        reasons: ["bounded"],
      },
    ).disposition).toBe("eligible");
  });

  it("blocks mutation when diagnosis is only proposal-level", () => {
    expect(decideRepairAdmission(
      transaction,
      { ...diagnostic, disposition: "proposal-only" },
      {
        transactionId: transaction.id,
        disposition: "minimal",
        affectedNodes: 1,
        affectedPaths: 1,
        affectedKinds: ["function"],
        sensitiveKinds: [],
        reasons: [],
      },
    ).disposition).toBe("blocked");
  });

  it("requires review when blast radius touches sensitive components", () => {
    expect(decideRepairAdmission(
      transaction,
      diagnostic,
      {
        transactionId: transaction.id,
        disposition: "review-required",
        affectedNodes: 2,
        affectedPaths: 2,
        affectedKinds: ["function", "world"],
        sensitiveKinds: ["world"],
        reasons: ["world affected"],
      },
    ).disposition).toBe("review-required");
  });

  it("preserves guarded authorization from diagnostic evidence", () => {
    expect(decideRepairAdmission(
      transaction,
      {
        ...diagnostic,
        disposition: "guarded-repair-eligible",
        effectiveEvidenceLevel: "proven-dependency-violation",
        claimStrength: "proven-static",
      },
      {
        transactionId: transaction.id,
        disposition: "minimal",
        affectedNodes: 1,
        affectedPaths: 1,
        affectedKinds: ["function"],
        sensitiveKinds: [],
        reasons: [],
      },
    ).disposition).toBe("guarded");
  });

  it("rejects a blast-radius decision for another transaction", () => {
    expect(decideRepairAdmission(
      transaction,
      diagnostic,
      {
        transactionId: "other",
        disposition: "minimal",
        affectedNodes: 1,
        affectedPaths: 1,
        affectedKinds: ["function"],
        sensitiveKinds: [],
        reasons: [],
      },
    ).disposition).toBe("blocked");
  });
});
