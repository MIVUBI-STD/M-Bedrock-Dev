import { describe, expect, it } from "vitest";
import {
  assessGameplayScenarioClosure,
} from "../../src/inspection/gameplay-scenario-closure.js";
import type {
  GameplayScenarioGraph,
} from "../../src/inspection/gameplay-scenario-model.js";

function baseGraph(): GameplayScenarioGraph {
  return {
    schemaVersion: 1,
    policy: "scenario-driven-causal-audit",
    scenarios: [],
    components: [],
    causalLinks: [],
    knowledgeRequirements: [],
    knowledgeReceipts: [],
    requiredInspectionGraph: {
      policy: "required-inspection-graph",
      nodes: [],
      receipts: [],
    },
  };
}

describe("gameplay scenario closure", () => {
  it("opens when a leaf scenario has components but no causal proof links", () => {
    const result = assessGameplayScenarioClosure({
      ...baseGraph(),
      scenarios: [{
        id: "scenario:wave",
        label: "wave",
        gameplayStage: "ACTIVE_GAMEPLAY",
        purpose: "Resolve one wave.",
        sourceSubjectIds: ["phase:wave"],
        componentIds: ["component:wave"],
        causalLinkIds: [],
        playerCounts: [1],
        requiredKnowledgeIds: [],
        composedScenarioIds: [],
      }],
      components: [{
        id: "component:wave",
        label: "Wave",
        kind: "phase",
        technicalRole: "wave state",
        gameplayPurpose: "Advance progression.",
        evidenceIds: ["evidence:wave"],
        usedByScenarioIds: ["scenario:wave"],
        orphan: false,
      }],
    });

    expect(result.status).toBe("OPEN");
    expect(result.unprovenLeafScenarioIds).toEqual([
      "scenario:wave",
    ]);
  });

  it("emits one narrow runtime proof request for a runtime-blocked causal link", () => {
    const result = assessGameplayScenarioClosure({
      ...baseGraph(),
      scenarios: [{
        id: "scenario:chunk",
        label: "remote-wave",
        gameplayStage: "ACTIVE_GAMEPLAY",
        purpose: "Run a remote enemy wave.",
        sourceSubjectIds: ["phase:wave"],
        componentIds: [
          "component:spawn",
          "component:objective",
        ],
        causalLinkIds: ["link:chunk"],
        playerCounts: [1],
        requiredKnowledgeIds: [],
        composedScenarioIds: [],
      }],
      components: [{
        id: "component:spawn",
        label: "Spawn",
        kind: "mechanic",
        technicalRole: "remote spawn",
        gameplayPurpose: "Create the enemy.",
        evidenceIds: ["evidence:spawn"],
        usedByScenarioIds: ["scenario:chunk"],
        orphan: false,
      }, {
        id: "component:objective",
        label: "Objective",
        kind: "objective",
        technicalRole: "wave objective",
        gameplayPurpose: "Receive enemy progression.",
        evidenceIds: ["evidence:objective"],
        usedByScenarioIds: ["scenario:chunk"],
        orphan: false,
      }],
      causalLinks: [{
        id: "link:chunk",
        scenarioId: "scenario:chunk",
        fromComponentId: "component:spawn",
        toComponentId: "component:objective",
        purpose:
          "Remote enemy remains simulated until it reaches the objective",
        evidenceIds: ["evidence:spawn"],
        subjectIds: ["phase:wave"],
        componentIds: [
          "component:spawn",
          "component:objective",
        ],
        status: "RUNTIME_BLOCKED",
        reason:
          "Static evidence cannot prove remote simulation residency.",
      }],
    });

    expect(result.status).toBe("PARTIAL");
    expect(result.runtimeProofRequests).toHaveLength(1);
    expect(
      result.runtimeProofRequests[0]?.narrowRuntimeQuestion,
    ).toContain(
      "Remote enemy remains simulated",
    );
  });

  it("does not treat a composition-only scenario as shallow", () => {
    const result = assessGameplayScenarioClosure({
      ...baseGraph(),
      scenarios: [{
        id: "scenario:journey",
        label: "full-journey",
        gameplayStage: "FULL",
        purpose: "Compose the journey.",
        sourceSubjectIds: [],
        componentIds: ["component:journey"],
        causalLinkIds: [],
        playerCounts: [1],
        requiredKnowledgeIds: [],
        composedScenarioIds: ["scenario:child"],
      }, {
        id: "scenario:child",
        label: "child",
        gameplayStage: "ACTIVE_GAMEPLAY",
        purpose: "Child scenario.",
        sourceSubjectIds: ["phase:child"],
        componentIds: ["component:child"],
        causalLinkIds: ["link:child"],
        playerCounts: [1],
        requiredKnowledgeIds: [],
        composedScenarioIds: [],
      }],
      components: [{
        id: "component:journey",
        label: "Journey",
        kind: "game",
        technicalRole: "composition",
        gameplayPurpose: "Compose child scenarios.",
        evidenceIds: [],
        usedByScenarioIds: ["scenario:journey"],
        orphan: false,
      }, {
        id: "component:child",
        label: "Child",
        kind: "phase",
        technicalRole: "phase",
        gameplayPurpose: "Advance gameplay.",
        evidenceIds: ["evidence:child"],
        usedByScenarioIds: ["scenario:child"],
        orphan: false,
      }],
      causalLinks: [{
        id: "link:child",
        scenarioId: "scenario:child",
        fromComponentId: "component:child",
        toComponentId: "component:child",
        purpose: "Self-contained proof edge.",
        evidenceIds: ["evidence:child"],
        subjectIds: ["phase:child"],
        componentIds: ["component:child"],
        status: "PROVEN",
        reason: "Selected-artifact proof exists.",
      }],
    });

    expect(result.unprovenLeafScenarioIds).toEqual([]);
    expect(result.status).toBe("CLOSED");
  });
});
