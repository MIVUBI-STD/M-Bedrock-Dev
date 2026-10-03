import { describe, expect, it } from "vitest";
import {
  projectReadyAuditIssues,
} from "../src/map-audit-issue-projection.js";
import type {
  GameplayScenarioGraph,
} from "../src/inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "../src/inspection/gameplay-defect-resolution.js";

const graph: GameplayScenarioGraph = {
  schemaVersion: 1,
  policy: "scenario-driven-causal-audit",
  scenarios: [
    {
      id: "scenario:capacity",
      label: "arena-capacity-plus-one",
      gameplayStage: "READY_START",
      purpose: "Validate playable arena capacity.",
      sourceSubjectIds: ["policy:arena"],
      componentIds: ["runtime:arena"],
      causalLinkIds: ["link:capacity"],
      playerCounts: [2],
      requiredKnowledgeIds: [],
      composedScenarioIds: [],
    },
    {
      id: "scenario:progression",
      label: "wave-progression",
      gameplayStage: "PROGRESSION",
      purpose: "Validate wave progression.",
      sourceSubjectIds: ["objective:wave"],
      componentIds: ["runtime:entities"],
      causalLinkIds: ["link:progression"],
      playerCounts: [1],
      requiredKnowledgeIds: [],
      composedScenarioIds: [],
    },
  ],
  components: [],
  causalLinks: [
    {
      id: "link:capacity",
      scenarioId: "scenario:capacity",
      fromComponentId: "runtime:arena",
      toComponentId: "policy:arena",
      purpose: "Visible arena capacity remains playable.",
      evidenceIds: [
        "world:arena-count",
        "capacity:safe-concurrency",
      ],
      subjectIds: ["policy:arena"],
      componentIds: ["runtime:arena"],
      status: "CONTRADICTED",
      reason: "Six arenas are visible but only two can run concurrently.",
    },
    {
      id: "link:progression",
      scenarioId: "scenario:progression",
      fromComponentId: "runtime:entities",
      toComponentId: "objective:wave",
      purpose: "Wave progression requires successful entity spawn.",
      evidenceIds: ["source:wave"],
      subjectIds: ["objective:wave"],
      componentIds: ["runtime:entities"],
      status: "CONTRADICTED",
      reason: "Progression advances without the required spawn.",
    },
  ],
  knowledgeRequirements: [],
  knowledgeReceipts: [],
  requiredInspectionGraph: {
    policy: "required-inspection-graph",
    nodes: [],
    receipts: [],
  },
};

const gate: GameplayDefectResolutionGate = {
  status: "READY_FOR_PROPOSED_BUG_SET",
  contradictedCausalLinkIds: [
    "link:capacity",
    "link:progression",
  ],
  resolutions: [
    {
      causalLinkId: "link:capacity",
      scenarioId: "scenario:capacity",
      disposition: "CONFIRMED_DEFECT_READY",
      gameplayTrigger: "Start a third independent arena.",
      gameplayConsequence: "Visible capacity is unavailable.",
      expectedOutcome: "All visible arena capacity is playable.",
      actualOutcome: "Only two arenas can run concurrently.",
      affectedScope: "multi-arena capacity",
    },
    {
      causalLinkId: "link:progression",
      scenarioId: "scenario:progression",
      disposition: "CONFIRMED_DEFECT_READY",
      gameplayTrigger: "Fail a required wave spawn.",
      gameplayConsequence: "Wave progression becomes incorrect.",
      expectedOutcome: "Progress only after required spawn lifecycle completes.",
      actualOutcome: "Progression advances without required spawn.",
      affectedScope: "wave progression",
    },
  ],
  confirmedDefectReadyIds: [
    "link:capacity",
    "link:progression",
  ],
  blockingCounterProofIds: [],
  runtimeProofRequiredIds: [],
  detectionGapIds: [],
  gameplayTranslationRequiredIds: [],
  counterProofSearchRequiredIds: [],
  issues: [],
};

describe("map audit issue projection", () => {
  it("separates design mismatch from implementation bug in one projection", () => {
    const result = projectReadyAuditIssues(
      graph,
      gate,
      [{
        subjectId: "runtime:arena-capacity",
        label: "Playable concurrent arena capacity",
        status: "DEGRADED",
        failureClass: "DESIGN_FAILURE",
        issueType: "DESIGN_MISMATCH",
        expectedCapacity: 6,
        playableCapacity: 2,
        technicalConstraintReasons: [],
        evidenceIds: [
          "world:arena-count",
          "capacity:safe-concurrency",
        ],
        playerFacingEvidenceIds: [
          "world:arena-count",
        ],
        informationMismatch: true,
        reason: "Presented arena capacity is not fully playable.",
      }],
    );

    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:capacity",
      )?.issueType,
    ).toBe("DESIGN_MISMATCH");
    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:capacity",
      ),
    ).toMatchObject({
      failureDomain: "arena-multi-arena",
      gameplayFlow: "READY_START",
      informationMismatch: true,
    });

    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:capacity",
      ),
    ).toMatchObject({
      failureDomain: "arena-multi-arena",
      contributingDomains: [
        "arena-multi-arena",
      ],
      gameplayFlow: "READY_START",
    });

    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:progression",
      )?.issueType,
    ).toBe("BUG");
    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:progression",
      ),
    ).toMatchObject({
      failureDomain: "progression-wave-objective",
      gameplayFlow: "PROGRESSION",
      informationMismatch: false,
    });

    expect(
      result.find(
        (item) =>
          item.causalLinkId === "link:progression",
      ),
    ).toMatchObject({
      failureDomain:
        "progression-wave-objective",
      contributingDomains: [
        "entity-ai-combat",
        "progression-wave-objective",
      ],
      gameplayFlow: "PROGRESSION",
    });
  });
});
