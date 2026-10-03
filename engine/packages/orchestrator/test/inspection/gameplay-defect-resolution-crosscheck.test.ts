import { describe, expect, it } from "vitest";
import {
  assessGameplayDefectResolutionGate,
} from "../../src/inspection/gameplay-defect-resolution.js";
import type {
  GameplayScenarioGraph,
} from "../../src/inspection/gameplay-scenario-model.js";

const graph: GameplayScenarioGraph = {
  schemaVersion: 1,
  policy: "scenario-driven-causal-audit",
  scenarios: [{
    id: "preset:arena-capacity",
    label: "arena-capacity-plus-one",
    gameplayStage: "READY_START",
    purpose: "Validate playable multi-arena capacity.",
    sourceSubjectIds: ["policy:arena-capacity"],
    componentIds: [
      "policy:arena-capacity",
      "runtime:arena",
    ],
    causalLinkIds: ["link:arena-capacity"],
    playerCounts: [2],
    requiredKnowledgeIds: [],
    composedScenarioIds: [],
  }],
  components: [],
  causalLinks: [{
    id: "link:arena-capacity",
    scenarioId: "preset:arena-capacity",
    fromComponentId: "runtime:arena",
    toComponentId: "policy:arena-capacity",
    purpose: "Visible arena capacity remains concurrently playable.",
    evidenceIds: [
      "world:arena-count",
      "capacity:safe-concurrency",
    ],
    subjectIds: ["policy:arena-capacity"],
    componentIds: [
      "policy:arena-capacity",
      "runtime:arena",
    ],
    status: "CONTRADICTED",
    reason: "Six arenas are visible but only two are concurrently playable.",
  }],
  knowledgeRequirements: [],
  knowledgeReceipts: [],
  requiredInspectionGraph: {
    policy: "required-inspection-graph",
    nodes: [],
    receipts: [],
  },
};

function resolution(
  searchedDimensions: readonly (
    | "owner"
    | "guard"
    | "generation"
    | "scope"
    | "cleanup"
    | "exclusion"
  )[],
) {
  return {
    causalLinkId: "link:arena-capacity",
    disposition: "CONFIRMED_DEFECT_READY" as const,
    gameplayTrigger: "Start independent parties in visible arenas.",
    gameplayConsequence: "Visible arena capacity is not actually available concurrently.",
    expectedOutcome: "All visible arena capacity is playable or design exposes the real limit.",
    actualOutcome: "Only two of six arenas can run concurrently.",
    affectedScope: "multi-arena admission",
    counterProofSearch: {
      schemaVersion: 1 as const,
      policy: "bounded-counterproof-search" as const,
      searchedDimensions,
      dimensionReceipts: searchedDimensions.map((dimension) => ({
        dimension,
        scopeIds: ["runtime:arena", "policy:arena-capacity"],
        evidenceIds: [
          "world:arena-count",
          "capacity:safe-concurrency",
        ],
      })),
      scopeIds: ["runtime:arena", "policy:arena-capacity"],
      evidenceIds: [
        "world:arena-count",
        "capacity:safe-concurrency",
      ],
      exhaustiveWithinScope: true,
      conclusion: "NO_BLOCKING_PROOF" as const,
    },
  };
}

describe("gameplay defect resolution crosscheck depth", () => {
  it("keeps ownership-sensitive contradiction in targeted counterproof continuation after safe automatic search", () => {
    const result = assessGameplayDefectResolutionGate(graph);

    expect(result.status).toBe("BLOCKED");
    expect(result.confirmedDefectReadyIds).toEqual([]);
    expect(
      result.counterProofSearchRequiredIds,
    ).toEqual(["link:arena-capacity"]);
    expect(
      result.resolutions[0]?.counterProofSearch?.searchedDimensions,
    ).toEqual([
      "exclusion",
      "guard",
      "scope",
    ]);
  });

  it("rejects shallow one-dimension counter-proof search for ownership-sensitive defects", () => {
    const result = assessGameplayDefectResolutionGate(
      graph,
      [resolution(["guard"])],
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.issues.join(" ")).toMatch(
      /missing relevant dimensions/i,
    );
  });

  it("does not treat an overlapping exclusion on a different commit target as blocking counter-proof", () => {
    const withUnrelatedGuard: GameplayScenarioGraph = {
      ...graph,
      causalLinks: [
        ...graph.causalLinks,
        {
          id: "link:unrelated-guard",
          scenarioId: "preset:arena-capacity",
          fromComponentId: "runtime:arena",
          toComponentId: "policy:other",
          purpose: "Guard unrelated policy state.",
          evidenceIds: ["source:other-guard"],
          subjectIds: ["policy:arena-capacity"],
          componentIds: ["runtime:arena"],
          intentEdgeKind: "excludes",
          status: "PROVEN",
          reason: "An unrelated guard exists.",
        },
      ],
    };

    const result =
      assessGameplayDefectResolutionGate(
        withUnrelatedGuard,
      );

    expect(result.blockingCounterProofIds).toEqual([]);
    expect(result.counterProofSearchRequiredIds).toEqual([
      "link:arena-capacity",
    ]);
  });

  it("accepts blocking counter-proof only when exclusion applies at the contradicted commit target", () => {
    const withExactGuard: GameplayScenarioGraph = {
      ...graph,
      causalLinks: [
        ...graph.causalLinks,
        {
          id: "link:exact-guard",
          scenarioId: "preset:arena-capacity",
          fromComponentId: "runtime:arena",
          toComponentId: "policy:arena-capacity",
          purpose: "Exclude unavailable arena admission.",
          evidenceIds: ["source:exact-guard"],
          subjectIds: ["policy:arena-capacity"],
          componentIds: ["runtime:arena"],
          intentEdgeKind: "excludes",
          status: "PROVEN",
          reason:
            "Exact admission guard blocks the contradicted target.",
        },
      ],
    };

    const result =
      assessGameplayDefectResolutionGate(
        withExactGuard,
      );

    expect(result.blockingCounterProofIds).toEqual([
      "link:arena-capacity",
    ]);
    expect(result.confirmedDefectReadyIds).toEqual([]);
  });

  it("accepts confirmation only after all context-relevant dimensions were searched", () => {
    const result = assessGameplayDefectResolutionGate(
      graph,
      [resolution([
        "owner",
        "guard",
        "generation",
        "scope",
        "cleanup",
        "exclusion",
      ])],
    );

    expect(result.status).toBe(
      "READY_FOR_PROPOSED_BUG_SET",
    );
    expect(result.confirmedDefectReadyIds).toEqual([
      "link:arena-capacity",
    ]);
  });
});
