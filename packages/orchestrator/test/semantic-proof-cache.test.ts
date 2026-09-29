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
  it("requires runtime claims to bind an exact runtime profile", () => {
    expect(() =>
      createSemanticProofClaim({
        claimId: "claim:runtime-unbound",
        claimRevision: "1",
        kind: "runtime",
        graph: graph(),
        basisNodeIds: [
          "function:pack:arena",
        ],
        evidenceIds: [
          "runtime:arena:1",
        ],
      })
    ).toThrow(
      /targetProfileFingerprint/,
    );
  });

  it("blocks reuse when stored evidence is no longer available", () => {
    const claim =
      createSemanticProofClaim({
        claimId: "claim:evidence",
        claimRevision: "1",
        kind: "static",
        graph: graph(),
        basisNodeIds: [
          "function:pack:arena",
        ],
        evidenceIds: [
          "evidence:required",
        ],
      });

    const result =
      assessSemanticProofReuse(
        claim,
        {
          graph: graph(),
          claimRevision: "1",
          availableEvidenceIds: [],
        },
      );

    expect(result.status)
      .toBe("blocked");
  });
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
          availableEvidenceIds: [
            "validation:arena:1",
          ],
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
          availableEvidenceIds: [
            "validation:arena:1",
          ],
          availableEvidenceIds: [
            "validation:arena:1",
            "semantic:scoreboard:1",
            "semantic:edge:1",
          ],
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
          availableEvidenceIds: [
            "runtime:arena:1",
          ],
          targetProfileFingerprint:
            "runtime-b",
        },
      );

    expect(result.status)
      .toBe("stale");
  });

  it("invalidates a derived-node proof when an incident source node changes even if topology stays the same", () => {
    const before = graph();
    before.addNode({
      id: "scoreboard:pack:round",
      identity: {
        kind: "scoreboard_objective",
        scope: "pack",
        identifier: "round",
      },
      kind: "scoreboard_objective",
      identifier: "round",
      source: {
        artifactId: "map",
        relativePath: "<derived>",
      },
    });
    before.addEdge({
      from: "function:pack:arena",
      type: "READS_SCOREBOARD",
      targetIdentifier: "round",
      status: "resolved",
      to: "scoreboard:pack:round",
      evidence: {
        source: {
          artifactId: "map",
          relativePath:
            "functions/arena.mcfunction",
        },
      },
    });

    const claim =
      createSemanticProofClaim({
        claimId:
          "claim:derived-scoreboard",
        claimRevision: "1",
        kind: "semantic",
        graph: before,
        basisNodeIds: [
          "scoreboard:pack:round",
        ],
        evidenceIds: [
          "semantic:scoreboard:1",
        ],
      });

    const after =
      graph(false, true);
    after.addNode({
      id: "scoreboard:pack:round",
      identity: {
        kind: "scoreboard_objective",
        scope: "pack",
        identifier: "round",
      },
      kind: "scoreboard_objective",
      identifier: "round",
      source: {
        artifactId: "map",
        relativePath: "<derived>",
      },
    });
    after.addEdge({
      from: "function:pack:arena",
      type: "READS_SCOREBOARD",
      targetIdentifier: "round",
      status: "resolved",
      to: "scoreboard:pack:round",
      evidence: {
        source: {
          artifactId: "map",
          relativePath:
            "functions/arena.mcfunction",
        },
      },
    });

    const result =
      assessSemanticProofReuse(
        claim,
        {
          graph: after,
          claimRevision: "1",
          availableEvidenceIds: [
            "semantic:scoreboard:1",
          ],
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
          availableEvidenceIds: [
            "validation:arena:1",
            "semantic:scoreboard:1",
            "semantic:edge:1",
          ],
        },
      );

    expect(result.status)
      .toBe("stale");
  });
});
