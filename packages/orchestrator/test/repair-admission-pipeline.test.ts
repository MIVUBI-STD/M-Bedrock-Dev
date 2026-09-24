import { describe, expect, it } from "vitest";
import { SemanticGraph } from "../../graph/src/graph.js";
import { createPatchTransaction } from "../../repair/src/create.js";
import { evaluateRepairAdmissionPipeline } from "../src/repair-admission-pipeline.js";

function source(relativePath: string) {
  return { artifactId: "art-1", relativePath };
}

function fixture() {
  const graph = new SemanticGraph();
  graph.addNode({
    id: "function:p:target",
    identity: { kind: "function", scope: "p", identifier: "target" },
    kind: "function",
    identifier: "target",
    source: source("functions/target.mcfunction"),
  });
  graph.addNode({
    id: "function:p:caller",
    identity: { kind: "function", scope: "p", identifier: "caller" },
    kind: "function",
    identifier: "caller",
    source: source("functions/caller.mcfunction"),
  });
  graph.addEdge({
    from: "function:p:caller",
    type: "CALLS",
    targetIdentifier: "target",
    status: "resolved",
    to: "function:p:target",
    evidence: { source: source("functions/caller.mcfunction") },
  });

  const transaction = createPatchTransaction({
    title: "demo",
    sourceFingerprint: "abc",
    operations: [{
      kind: "replace-text",
      source: source("functions/target.mcfunction"),
      expected: "a",
      replacement: "b",
    }],
    preconditions: [{
      kind: "source-fingerprint",
      expected: "abc",
    }],
    validation: [],
  });

  return { graph, transaction };
}

describe("repair admission pipeline", () => {
  it("runs counterfactual, blast radius, admission, and proof in one deterministic path", () => {
    const { graph, transaction } = fixture();
    const result = evaluateRepairAdmissionPipeline({
      graph,
      transaction,
      diagnostic: {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate"],
        disposition: "repair-eligible",
        selectedCandidateId: "candidate",
        effectiveEvidenceLevel: "proven-with-observed-outcome",
        claimStrength: "proven-runtime",
        reasons: ["runtime proof"],
      },
      changedNodeIds: ["function:p:target"],
      supportingInvariantIds: ["invariant::ready"],
    });

    expect(result.blastRadius.disposition).toBe("bounded");
    expect(result.admission.disposition).toBe("eligible");
    expect(result.proof.supportingInvariantIds)
      .toEqual(["invariant::ready"]);
    expect(result.proof.requiredRevalidationNodeIds)
      .toEqual(["function:p:caller"]);
  });

  it("cannot bypass a blocked diagnostic decision", () => {
    const { graph, transaction } = fixture();
    const result = evaluateRepairAdmissionPipeline({
      graph,
      transaction,
      diagnostic: {
        incidentId: "incident-1",
        activeCandidateIds: ["candidate"],
        disposition: "proposal-only",
        selectedCandidateId: "candidate",
        effectiveEvidenceLevel: "corroborated-candidate",
        claimStrength: "corroborated",
        reasons: ["insufficient proof"],
      },
      changedNodeIds: ["function:p:target"],
    });

    expect(result.admission.disposition).toBe("blocked");
    expect(result.proof.admissionDisposition).toBe("blocked");
  });
});
