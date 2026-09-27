import { describe, expect, it } from "vitest";
import {
  compareGameplayIntentModels,
  type GameplayIntentModel,
} from "../src/index.js";

function baseModel(
  id: string,
): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id,
    artifactId: id,
    evidence: [{
      id: "e:state",
      origin: "source-code",
      locator: "scripts/state.js",
      summary: "Authored state.",
    }],
    nodes: [{
      id: "state:active",
      kind: "state",
      label: "Active",
      status: "authored",
      evidenceIds: ["e:state"],
    }],
    edges: [],
    invariants: [{
      id: "inv:active",
      statement: "Active is a valid authored state.",
      strength: "must",
      status: "authored",
      subjectIds: ["state:active"],
      evidenceIds: ["e:state"],
    }],
    unknowns: [],
  };
}

describe("gameplay intent historical comparison", () => {
  it("treats artifact identity changes as intent-stable when semantics are unchanged", () => {
    const before = baseModel("old-artifact");
    const after: GameplayIntentModel = {
      ...baseModel("new-artifact"),
      evidence: [{
        id: "e:state-new",
        origin: "source-code",
        locator: "scripts/state.js",
        summary: "Same authored state in repackaged artifact.",
      }],
      nodes: [{
        ...baseModel("new-artifact").nodes[0]!,
        evidenceIds: ["e:state-new"],
      }],
      invariants: [{
        ...baseModel("new-artifact").invariants[0]!,
        evidenceIds: ["e:state-new"],
      }],
    };

    const result = compareGameplayIntentModels(
      before,
      after,
    );

    expect(result.disposition).toBe("stable");
    expect(result.semanticallyStable).toBe(true);
    expect(result.added.nodeIds).toEqual([]);
    expect(result.removed.nodeIds).toEqual([]);
    expect(result.nodeEvidenceOriginChanges).toEqual([]);
  });

  it("reports pure semantic expansion separately from replacement", () => {
    const before = baseModel("old");
    const after: GameplayIntentModel = {
      ...baseModel("new"),
      evidence: [
        ...baseModel("new").evidence,
        {
          id: "e:cleanup",
          origin: "source-code",
          locator: "scripts/cleanup.js",
          summary: "Cleanup lifecycle.",
        },
      ],
      nodes: [
        ...baseModel("new").nodes,
        {
          id: "lifecycle:cleanup",
          kind: "lifecycle",
          label: "Cleanup",
          status: "inferred",
          evidenceIds: ["e:cleanup"],
        },
      ],
      edges: [{
        id: "edge:cleanup-active",
        from: "lifecycle:cleanup",
        to: "state:active",
        kind: "recovers-to",
        status: "inferred",
        evidenceIds: ["e:cleanup"],
      }],
    };

    const result = compareGameplayIntentModels(
      before,
      after,
    );

    expect(result.disposition).toBe("expanded");
    expect(result.added.nodeIds).toEqual([
      "lifecycle:cleanup",
    ]);
    expect(result.added.edgeKeys).toEqual([
      "recovers-to::lifecycle:cleanup::state:active",
    ]);
  });

  it("records status and evidence-origin changes as semantic history changes", () => {
    const before = baseModel("old");
    const after: GameplayIntentModel = {
      ...baseModel("new"),
      evidence: [{
        id: "e:runtime",
        origin: "historical-diff",
        locator: "history",
        summary: "Historical corroboration.",
      }],
      nodes: [{
        ...baseModel("new").nodes[0]!,
        status: "inferred",
        evidenceIds: ["e:runtime"],
      }],
      invariants: [{
        ...baseModel("new").invariants[0]!,
        status: "inferred",
        evidenceIds: ["e:runtime"],
      }],
    };

    const result = compareGameplayIntentModels(
      before,
      after,
    );

    expect(result.disposition).toBe("changed");
    expect(result.nodeStatusChanges).toEqual([{
      id: "state:active",
      before: "authored",
      after: "inferred",
    }]);
    expect(result.nodeEvidenceOriginChanges).toEqual([{
      id: "state:active",
      before: ["source-code"],
      after: ["historical-diff"],
    }]);
    expect(result.invariantChanges).toEqual([{
      id: "inv:active",
      changedFields: ["status"],
    }]);
  });
});
