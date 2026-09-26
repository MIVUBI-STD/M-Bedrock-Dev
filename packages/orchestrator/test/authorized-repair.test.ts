import { describe, expect, it } from "vitest";
import { createPatchTransaction } from "../../repair/src/index.js";
import {
  authorizeRepairMutation,
} from "../src/authorized-repair.js";
import type { RepairProofBundle } from "../src/repair-proof-bundle.js";
import {
  CONTRACT_REGISTRY_REVISION,
} from "../../project-model/src/index.js";

function transaction(validation = true) {
  return createPatchTransaction({
    title: "demo",
    sourceFingerprint: "abc",
    operations: [{
      kind: "replace-text",
      source: {
        artifactId: "art-1",
        relativePath: "functions/demo.mcfunction",
      },
      expected: "a",
      replacement: "b",
    }],
    preconditions: [{
      kind: "source-fingerprint",
      expected: "abc",
    }],
    validation: validation
      ? [{
          kind: "rebuild-graph" as const,
        }]
      : [],
  });
}

function proof(
  txId: string,
  disposition: RepairProofBundle["admissionDisposition"],
): RepairProofBundle {
  return {
    transactionId: txId,
    sourceFingerprint: "abc",
    graphFingerprint: "graph-current",
    decisionBasis: {
      contractRegistryRevision: CONTRACT_REGISTRY_REVISION,
      sourceFingerprint: "abc",
      graphFingerprint: "graph-current",
      ...(disposition === "guarded"
        ? {}
        : { runtimeEvidenceRevision: "evidence-current" }),
    },
    incidentId: "incident-1",
    selectedCandidateId: "candidate",
    diagnosticDisposition:
      disposition === "guarded"
        ? "guarded-repair-eligible"
        : "repair-eligible",
    claimStrength:
      disposition === "guarded"
        ? "proven-static"
        : "proven-runtime",
    effectiveEvidenceLevel:
      disposition === "guarded"
        ? "proven-dependency-violation"
        : "proven-with-observed-outcome",
    proofState:
      disposition === "guarded"
        ? "intervention-supported"
        : "causal",
    blastRadiusDisposition: "minimal",
    admissionDisposition: disposition,
    supportingInvariantIds: [],
    changedNodeIds: ["function:p:demo"],
    affectedNodeIds: ["function:p:demo"],
    requiredRevalidationNodeIds: [],
    requiredRevalidationPaths: [],
    impactTraces: [],
    reasons: [],
  };
}

describe("authorized repair mutation", () => {
  it("authorizes an eligible proof with concrete validation", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        runtimeEvidenceRevision: "evidence-current",
      },
    )).toMatchObject({
      authorized: true,
      mode: "eligible",
    });
  });

  it("blocks proof for another transaction", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof("other", "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
      },
    ).authorized).toBe(false);
  });

  it("blocks review-required and blocked admission", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "review-required"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
      },
    ).authorized).toBe(false);
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "blocked"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
      },
    ).authorized).toBe(false);
  });

  it("requires explicit authorization for guarded repair", () => {
    const tx = transaction();
    const guarded = proof(tx.id, "guarded");

    expect(authorizeRepairMutation(
      tx,
      guarded,
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
      },
    ).authorized).toBe(false);

    expect(authorizeRepairMutation(
      tx,
      guarded,
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
      },
      { allowGuarded: true },
    )).toMatchObject({
      authorized: true,
      mode: "guarded",
    });
  });

  it("refuses repair without concrete validation steps", () => {
    const tx = transaction(false);
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
      },
    ).authorized).toBe(false);
  });

  it("rejects stale semantic graph proof", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-new",
      },
    )).toMatchObject({
      authorized: false,
    });
  });

  it("rejects stale source fingerprint proof", () => {
    const tx = transaction();
    expect(authorizeRepairMutation(
      tx,
      proof(tx.id, "eligible"),
      {
        currentSourceFingerprint: "new-source",
        currentGraphFingerprint: "graph-current",
      },
    )).toMatchObject({
      authorized: false,
    });
  });

  it("rejects stale runtime evidence proof", () => {
    const tx = transaction();
    const boundProof: RepairProofBundle = {
      ...proof(tx.id, "eligible"),
      decisionBasis: {
        ...proof(tx.id, "eligible").decisionBasis,
        runtimeEvidenceRevision: "evidence-a",
      },
    };

    expect(authorizeRepairMutation(
      tx,
      boundProof,
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        runtimeEvidenceRevision: "evidence-b",
      },
    )).toMatchObject({
      authorized: false,
    });
  });

  it("accepts repair proof when runtime evidence revision still matches", () => {
    const tx = transaction();
    const boundProof: RepairProofBundle = {
      ...proof(tx.id, "eligible"),
      decisionBasis: {
        ...proof(tx.id, "eligible").decisionBasis,
        runtimeEvidenceRevision: "evidence-a",
      },
    };

    expect(authorizeRepairMutation(
      tx,
      boundProof,
      {
        currentSourceFingerprint: "abc",
        currentGraphFingerprint: "graph-current",
        runtimeEvidenceRevision: "evidence-a",
      },
    )).toMatchObject({
      authorized: true,
      mode: "eligible",
    });
  });
});
