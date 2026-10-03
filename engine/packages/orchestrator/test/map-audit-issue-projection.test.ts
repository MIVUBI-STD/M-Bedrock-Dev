import { describe, expect, it } from "vitest";
import {
  projectAllNeedValidationAuditIssues,
  projectReadyAuditIssues,
  projectSignalNeedValidationAuditIssues,
  groupNeedValidationTests,
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
  it("projects unresolved material dependencies as NEED_VALIDATION instead of hiding them", async () => {
    const module = await import(
      "../src/map-audit-issue-projection.js"
    );
    const unresolvedGraph: GameplayScenarioGraph = {
      ...graph,
      causalLinks: [{
        id: "link:runtime-gap",
        scenarioId: "scenario:progression",
        fromComponentId: "runtime:entities",
        toComponentId: "objective:wave",
        purpose: "Remote enemy remains simulated until wave completion.",
        evidenceIds: ["source:wave"],
        subjectIds: ["objective:wave"],
        componentIds: ["runtime:entities"],
        status: "RUNTIME_BLOCKED",
        reason: "Static evidence cannot prove Minecraft runtime residency.",
      }],
    };
    const unresolvedGate: GameplayDefectResolutionGate = {
      status: "READY_FOR_PROPOSED_BUG_SET",
      contradictedCausalLinkIds: [],
      resolutions: [],
      confirmedDefectReadyIds: [],
      blockingCounterProofIds: [],
      runtimeProofRequiredIds: [],
      detectionGapIds: [],
      gameplayTranslationRequiredIds: [],
      counterProofSearchRequiredIds: [],
      issues: [],
    };

    const result =
      module.projectNeedValidationAuditIssues(
        unresolvedGraph,
        unresolvedGate,
      );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      status: "NEED_VALIDATION",
      failureDomain:
        "progression-wave-objective",
      gameplayFlow: "PROGRESSION",
    });
    expect(result[0]?.validationReason).toMatch(
      /runtime observation/i,
    );
    expect(result[0]?.validationTest).toContain(
      "Remote enemy remains simulated",
    );
  });

  it("surfaces missing required knowledge as NEED_VALIDATION instead of hiding it in closure", () => {
    const knowledgeGraph: GameplayScenarioGraph = {
      ...graph,
      causalLinks: [],
      knowledgeRequirements: [{
        id: "knowledge:scenario:progression:chunk-simulation",
        scenarioId: "scenario:progression",
        domain: "chunk-simulation",
        reason:
          "Wave progression requires chunk-simulation evidence.",
        capabilityIds: ["chunk-lifecycle-integrity"],
        dependsOnRequirementIds: [],
        subjectIds: ["objective:wave"],
        componentIds: ["runtime:entities"],
      }],
      knowledgeReceipts: [{
        requirementId:
          "knowledge:scenario:progression:chunk-simulation",
        scenarioId: "scenario:progression",
        domain: "chunk-simulation",
        status: "MISSING_REQUIRED_KNOWLEDGE",
        evidenceIds: [],
        capabilityIdsUsed: [
          "chunk-lifecycle-integrity",
        ],
        subjectIds: ["objective:wave"],
        componentIds: ["runtime:entities"],
        reason:
          "Chunk analysis executed but returned no decisive scenario-scoped evidence.",
      }],
      requiredInspectionGraph: {
        policy: "required-inspection-graph",
        nodes: [],
        receipts: [],
      },
    };
    const emptyGate: GameplayDefectResolutionGate = {
      status: "READY_FOR_PROPOSED_BUG_SET",
      contradictedCausalLinkIds: [],
      resolutions: [],
      confirmedDefectReadyIds: [],
      blockingCounterProofIds: [],
      runtimeProofRequiredIds: [],
      detectionGapIds: [],
      gameplayTranslationRequiredIds: [],
      counterProofSearchRequiredIds: [],
      issues: [],
    };

    const result =
      projectAllNeedValidationAuditIssues(
        knowledgeGraph,
        emptyGate,
      );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      status: "NEED_VALIDATION",
      knowledgeRequirementId:
        "knowledge:scenario:progression:chunk-simulation",
      validationGroupKey:
        "scenario:progression:chunk-simulation",
    });
    expect(result[0]?.missingProof).toMatch(
      /chunk-simulation/i,
    );
  });

  it("surfaces negative-space and high temporal signals instead of leaving them as hidden attention counts", () => {
    const result =
      projectSignalNeedValidationAuditIssues(
        [{
          id: "negative-space:entry-without-exit:state:round",
          kind: "entry-without-exit",
          subjectId: "state:round",
          evidenceIds: ["state:enter"],
          reason:
            "Gameplay state is reachable but has no grounded exit.",
        }],
        [{
          leftSystem: "callback:reward",
          rightSystem: "arena:cleanup",
          factors: [
            "async",
            "cleanup",
          ],
          priority: "high",
          windows: [
            "before",
            "overlap",
            "after",
          ],
        }],
      );

    expect(result).toHaveLength(2);
    expect(result.every(
      (item) => item.status === "NEED_VALIDATION",
    )).toBe(true);
    expect(result.map(
      (item) => item.failureDomain,
    )).toContain("state-ownership");
    expect(result.map(
      (item) => item.failureDomain,
    )).toContain("temporal-async");
  });

  it("consolidates multiple unresolved findings into one validation test group", () => {
    const findings =
      projectSignalNeedValidationAuditIssues(
        [{
          id: "negative-space:producer-without-consumer:state:round",
          kind: "producer-without-consumer",
          subjectId: "state:round",
          evidenceIds: ["state:write"],
          reason:
            "State/event is produced but no consuming gameplay path is present.",
        }, {
          id: "negative-space:entry-without-exit:state:round",
          kind: "entry-without-exit",
          subjectId: "state:round",
          evidenceIds: ["state:enter"],
          reason:
            "Gameplay state is reachable but has no grounded exit.",
        }],
        [],
      );

    const groups = groupNeedValidationTests(
      findings,
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.findingIds).toHaveLength(2);
    expect(groups[0]?.key).toBe(
      "negative-space:state:round",
    );
  });

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
      ),
    ).toMatchObject({
      status: "PROVEN",
      issueType: "DESIGN_MISMATCH",
    });
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
      ),
    ).toMatchObject({
      status: "PROVEN",
      issueType: "BUG",
    });
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
