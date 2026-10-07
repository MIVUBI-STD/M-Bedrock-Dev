import { describe, expect, it } from "vitest";
import { assessReadyResolutionSaturation } from "../src/map-audit-proof-saturation.js";

function graph(impactPathComponentIds: readonly string[]) {
  return {
    scenarios: [{
      id: "s1",
      label: "wave-progression",
      gameplayStage: "PROGRESSION",
      purpose: "Complete the wave",
      componentIds: ["runtime:chunks", "objective:wave"],
    }],
    components: [
      { id: "runtime:chunks", label: "Chunk simulation" },
      { id: "objective:wave", label: "Wave objective" },
    ],
    causalLinks: [{
      id: "l1",
      scenarioId: "s1",
      status: "CONTRADICTED",
      purpose: "Actors remain simulated until completion.",
      reason: "Simulation ownership is insufficient.",
      evidenceIds: ["source:contradiction"],
      componentIds: ["runtime:chunks"],
      knowledgeRequirementIds: [
        "knowledge:s1:chunk-simulation",
        "knowledge:s1:platform-constraints",
      ],
      impactPathComponentIds,
      impactPathEvidenceIds: impactPathComponentIds.length > 0 ? ["source:impact"] : [],
      dimensionEvidence: {},
    }],
    knowledgeReceipts: [
      { requirementId: "knowledge:s1:chunk-simulation", evidenceIds: ["knowledge:chunk"] },
      { requirementId: "knowledge:s1:platform-constraints", evidenceIds: ["knowledge:platform"] },
    ],
    knowledgeRequirements: [
      { id: "knowledge:s1:chunk-simulation", domain: "chunk-simulation" },
      { id: "knowledge:s1:platform-constraints", domain: "platform-constraints" },
    ],
  } as any;
}

const resolution = {
  causalLinkId: "l1",
  scenarioId: "s1",
  disposition: "CONFIRMED_DEFECT_READY" as const,
  gameplayTrigger: "Complete the wave",
  gameplayConsequence: "Wave completion is blocked.",
  expectedOutcome: "Actors remain simulated.",
  actualOutcome: "Simulation ownership is insufficient.",
  affectedScope: "wave",
  evidenceIds: ["source:contradiction"],
  knowledgeRequirementIds: [
    "knowledge:s1:chunk-simulation",
    "knowledge:s1:platform-constraints",
  ],
  counterProofSearch: {
    conclusion: "NO_BLOCKING_PROOF" as const,
    exhaustiveWithinScope: true,
    evidenceIds: ["source:contradiction"],
  },
};

describe("map audit proof saturation", () => {
  it("does not infer absence-style proof from a generic contradiction", () => {
    const result = assessReadyResolutionSaturation(
      graph([]),
      resolution as any,
    );
    expect(result.saturated).toBe(false);
    expect(result.missingFamilyCriteriaIds).toContain(
      "platform-constraint-bound",
    );
  });

  it("can reuse canonical evidence for grounded cross-domain proof criteria", () => {
    const result = assessReadyResolutionSaturation(
      graph(["objective:wave"]),
      resolution as any,
    );
    const platform = result.familyCriteria.find(
      (item) => item.id === "platform-constraint-bound",
    );
    expect(platform?.satisfied).toBe(true);
    expect(platform?.evidenceIds.length).toBeGreaterThan(0);
  });
});
