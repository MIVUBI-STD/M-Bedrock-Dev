import { describe, expect, it } from "vitest";
import { assessGameplayDefectResolutionGate } from "../src/inspection/gameplay-defect-resolution.js";

function graph(componentIds: readonly string[], domain?: string) {
  return {
    scenarios: [{
      id: "s1",
      label: "generic",
      gameplayStage: "ACTIVE_GAMEPLAY",
      purpose: "Play",
      playerCounts: [1],
    }],
    components: [],
    causalLinks: [{
      id: "l1",
      scenarioId: "s1",
      status: "CONTRADICTED",
      purpose: "Dependency",
      reason: "Contradiction",
      evidenceIds: ["e1"],
      subjectIds: ["subject"],
      componentIds,
      knowledgeRequirementIds: domain ? ["k1"] : [],
      impactPathComponentIds: [],
      impactPathEvidenceIds: [],
      dimensionEvidence: {},
    }],
    knowledgeRequirements: domain
      ? [{ id: "k1", domain }]
      : [],
    knowledgeReceipts: [],
  } as any;
}

describe("gameplay defect proof dimensions", () => {
  it("does not require unrelated guard/exclusion proof for pure geometry", () => {
    const gate = assessGameplayDefectResolutionGate(
      graph(["runtime:spatial"], "spatial-authority"),
    );
    const receipt = gate.resolutions[0]?.counterProofSearch;
    expect(receipt?.searchedDimensions).toContain("scope");
    expect(receipt?.searchedDimensions).not.toContain("guard");
    expect(receipt?.searchedDimensions).not.toContain("exclusion");
  });

  it("keeps guard exclusion owner generation and cleanup pressure for temporal ownership", () => {
    const gate = assessGameplayDefectResolutionGate(
      graph(["runtime:persistence"], "temporal-ownership"),
    );
    const resolution = gate.resolutions[0];
    expect(resolution?.disposition).toBe(
      "COUNTERPROOF_SEARCH_REQUIRED",
    );
  });
});
