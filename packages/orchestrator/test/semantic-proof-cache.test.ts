import {
  describe,
  expect,
  it,
} from "vitest";
import {
  SemanticGraph,
} from "../../graph/src/index.js";
import {
  assessSemanticProofReuse,
  createSemanticProofClaim,
} from "../src/semantic-proof-cache.js";

function graph(
  changedShop = false,
  changedArena = false,
): SemanticGraph {
  const value =
    new SemanticGraph();

  value.addNode({
    id: "function:pack:arena",
    identity: {
      kind: "function",
      scope: "pack",
      identifier: "arena",
    },
    kind: "function",
    identifier: "arena",
    source: {
      artifactId: "map",
      relativePath:
        "functions/arena.mcfunction",
    },
    contentHash:
      changedArena
        ? "arena-v2"
        : "arena-v1",
  });

  value.addNode({
    id: "function:pack:shop",
    identity: {
      kind: "function",
      scope: "pack",
      identifier: "shop",
    },
    kind: "function",
    identifier: "shop",
    source: {
      artifactId: "map",
      relativePath:
        "functions/shop.mcfunction",
    },
    contentHash:
      changedShop
        ? "shop-v2"
        : "shop-v1",
  });

  return value;
}

describe("semantic proof cache", () => {
  it("reuses proof when unrelated semantic nodes change", () => {
    const claim =
      createSemanticProofClaim({
        claimId:
          "claim:arena-capacity",
        claimRevision: "1",
        kind: "validation",
        graph: graph(),
        basisNodeIds: [
          "function:pack:arena",
        ],
        evidenceIds: [
          "validation:arena:1",
        ],
      });

    const result =
      assessSemanticProofReuse(
        claim,
        {
          graph: graph(true, false),
          claimRevision: "1",
        },
      );

    expect(result.status)
      .toBe("reusable");
  });

  it("invalidates proof when a basis node changes", () => {
    const claim =
      createSemanticProofClaim({
        claimId:
          "claim:arena-capacity",
        claimRevision: "1",
        kind: "validation",
        graph: graph(),
        basisNodeIds: [
          "function:pack:arena",
        ],
        evidenceIds: [
          "validation:arena:1",
        ],
      });

    const result =
      assessSemanticProofReuse(
        claim,
        {
          graph:
            graph(false, true),
          claimRevision: "1",
        },
      );

    expect(result.status)
      .toBe("stale");
  });

  it("invalidates runtime-bound proof when target profile changes", () => {
    const claim =
      createSemanticProofClaim({
        claimId:
          "claim:arena-runtime",
        claimRevision: "1",
        kind: "runtime",
        graph: graph(),
        basisNodeIds: [
          "function:pack:arena",
        ],
        evidenceIds: [
          "runtime:arena:1",
        ],
        targetProfileFingerprint:
          "runtime-a",
      });

    const result =
      assessSemanticProofReuse(
        claim,
        {
          graph: graph(),
          claimRevision: "1",
          targetProfileFingerprint:
            "runtime-b",
        },
      );

    expect(result.status)
      .toBe("stale");
  });

  it("invalidates proof when an incident dependency edge changes", () => {
    const before = graph();
    before.addEdge({
      from:
        "function:pack:shop",
      type: "CALLS",
      targetIdentifier: "arena",
      status: "resolved",
      to:
        "function:pack:arena",
      evidence: {
        source: {
          artifactId: "map",
          relativePath:
            "functions/shop.mcfunction",
        },
      },
    });

    const claim =
      createSemanticProofClaim({
        claimId:
          "claim:arena-edge",
        claimRevision: "1",
        kind: "semantic",
        graph: before,
        basisNodeIds: [
          "function:pack:arena",
        ],
        evidenceIds: [
          "semantic:edge:1",
        ],
      });

    const result =
      assessSemanticProofReuse(
        claim,
        {
          graph: graph(),
          claimRevision: "1",
        },
      );

    expect(result.status)
      .toBe("stale");
  });
});
