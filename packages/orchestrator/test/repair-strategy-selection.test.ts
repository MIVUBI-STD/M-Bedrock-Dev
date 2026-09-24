import { describe, expect, it } from "vitest";
import { SemanticGraph } from "../../graph/src/graph.js";
import { createPatchTransaction } from "../../repair/src/create.js";
import {
  selectRepairStrategy,
} from "../src/repair-strategy-selection.js";

function source(relativePath: string) {
  return { artifactId: "art-1", relativePath };
}

function transaction(
  title: string,
  relativePath: string,
) {
  return createPatchTransaction({
    title,
    sourceFingerprint: "source",
    operations: [{
      kind: "replace-text",
      source: source(relativePath),
      expected: "old",
      replacement: "new",
    }],
    preconditions: [{
      kind: "source-fingerprint",
      expected: "source",
    }],
    validation: [{
      kind: "rebuild-graph",
    }],
  });
}

function graphFixture() {
  const graph = new SemanticGraph();

  graph.addNode({
    id: "function:p:target",
    identity: {
      kind: "function",
      scope: "p",
      identifier: "target",
    },
    kind: "function",
    identifier: "target",
    source: source("functions/target.mcfunction"),
  });
  graph.addNode({
    id: "function:p:caller",
    identity: {
      kind: "function",
      scope: "p",
      identifier: "caller",
    },
    kind: "function",
    identifier: "caller",
    source: source("functions/caller.mcfunction"),
  });
  graph.addNode({
    id: "function:p:independent-a",
    identity: {
      kind: "function",
      scope: "p",
      identifier: "independent-a",
    },
    kind: "function",
    identifier: "independent-a",
    source: source("functions/independent-a.mcfunction"),
  });
  graph.addNode({
    id: "function:p:independent-b",
    identity: {
      kind: "function",
      scope: "p",
      identifier: "independent-b",
    },
    kind: "function",
    identifier: "independent-b",
    source: source("functions/independent-b.mcfunction"),
  });

  graph.addEdge({
    from: "function:p:caller",
    type: "CALLS",
    targetIdentifier: "target",
    status: "resolved",
    to: "function:p:target",
    evidence: {
      source: source("functions/caller.mcfunction"),
    },
  });

  return graph;
}

const diagnostic = {
  incidentId: "incident-1",
  activeCandidateIds: ["cause-1"],
  disposition: "repair-eligible" as const,
  selectedCandidateId: "cause-1",
  effectiveEvidenceLevel:
    "proven-with-observed-outcome" as const,
  claimStrength: "proven-runtime" as const,
  reasons: ["runtime proof"],
};

describe("repair strategy selection", () => {
  it("selects the smaller causally valid strategy", () => {
    const graph = graphFixture();

    const result = selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "wide",
        transaction: transaction(
          "wide",
          "functions/target.mcfunction",
        ),
        changedNodeIds: ["function:p:target"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }, {
        strategyId: "small",
        transaction: transaction(
          "small",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }],
      {
        requiredInvariantIds: ["invariant:ready"],
      },
    );

    expect(result.status).toBe("selected");
    if (result.status !== "selected") return;
    expect(result.selected.strategyId).toBe("small");
    expect(result.selected.metrics.affectedNodes).toBe(1);
  });

  it("returns ambiguous when strategies are equally minimal", () => {
    const graph = graphFixture();

    const result = selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "a",
        transaction: transaction(
          "a",
          "functions/independent-a.mcfunction",
        ),
        changedNodeIds: ["function:p:independent-a"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }, {
        strategyId: "b",
        transaction: transaction(
          "b",
          "functions/independent-b.mcfunction",
        ),
        changedNodeIds: ["function:p:independent-b"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["cause-1"],
      }],
      {
        requiredInvariantIds: ["invariant:ready"],
      },
    );

    expect(result.status).toBe("ambiguous");
    if (result.status !== "ambiguous") return;
    expect(result.tied.map((item) => item.strategyId).sort())
      .toEqual(["a", "b"]);
  });

  it("rejects a small strategy that does not address the selected cause", () => {
    const graph = graphFixture();

    const result = selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "unrelated",
        transaction: transaction(
          "unrelated",
          "functions/caller.mcfunction",
        ),
        changedNodeIds: ["function:p:caller"],
        supportingInvariantIds: ["invariant:ready"],
        addressesCandidateIds: ["other-cause"],
      }],
      {
        requiredInvariantIds: ["invariant:ready"],
      },
    );

    expect(result.status).toBe("none-eligible");
    expect(result.assessments[0]?.reasons.join(" "))
      .toMatch(/does not address/);
  });

  it("requires explicit policy to select guarded repair strategies", () => {
    const graph = graphFixture();
    const guardedDiagnostic = {
      ...diagnostic,
      disposition: "guarded-repair-eligible" as const,
      effectiveEvidenceLevel:
        "proven-dependency-violation" as const,
      claimStrength: "proven-static" as const,
    };
    const candidate = {
      strategyId: "guarded",
      transaction: transaction(
        "guarded",
        "functions/caller.mcfunction",
      ),
      changedNodeIds: ["function:p:caller"],
      supportingInvariantIds: ["invariant:ready"],
      addressesCandidateIds: ["cause-1"],
    };

    expect(selectRepairStrategy(
      graph,
      guardedDiagnostic,
      [candidate],
      { requiredInvariantIds: ["invariant:ready"] },
    ).status).toBe("none-eligible");

    expect(selectRepairStrategy(
      graph,
      guardedDiagnostic,
      [candidate],
      {
        requiredInvariantIds: ["invariant:ready"],
        allowGuarded: true,
      },
    ).status).toBe("selected");
  });

  it("rejects duplicate strategy ids", () => {
    const graph = graphFixture();
    const txA = transaction(
      "a",
      "functions/independent-a.mcfunction",
    );
    const txB = transaction(
      "b",
      "functions/independent-b.mcfunction",
    );

    expect(() => selectRepairStrategy(
      graph,
      diagnostic,
      [{
        strategyId: "same",
        transaction: txA,
        changedNodeIds: ["function:p:independent-a"],
        supportingInvariantIds: [],
        addressesCandidateIds: ["cause-1"],
      }, {
        strategyId: "same",
        transaction: txB,
        changedNodeIds: ["function:p:independent-b"],
        supportingInvariantIds: [],
        addressesCandidateIds: ["cause-1"],
      }],
    )).toThrow(/Duplicate repair strategy id/);
  });
});
