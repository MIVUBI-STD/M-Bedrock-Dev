import { describe, expect, it } from "vitest";
import {
  assessGameplayScenarioClosure,
} from "../../src/inspection/gameplay-scenario-closure.js";
import {
  deriveGameplayArchitectureNavigation,
  type GameplayScenarioGraph,
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
        knowledgeRequirementIds: [],
        impactPathComponentIds: [],
        impactPathEvidenceIds: [],
        dimensionEvidence: {},
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

  it("emits one targeted tester obligation for each detection gap", () => {
    const result = assessGameplayScenarioClosure({
      ...baseGraph(),
      scenarios: [{
        id: "scenario:inventory",
        label: "inventory-reconnect",
        gameplayStage: "RECOVERY",
        purpose: "Recover inventory after reconnect.",
        sourceSubjectIds: ["mechanic:inventory"],
        componentIds: [
          "component:inventory",
          "component:reconnect",
        ],
        causalLinkIds: ["link:inventory-gap"],
        playerCounts: [1],
        requiredKnowledgeIds: [],
        composedScenarioIds: [],
      }],
      components: [{
        id: "component:inventory",
        label: "Inventory",
        kind: "mechanic",
        technicalRole: "inventory mutation",
        gameplayPurpose: "Restore the correct loadout.",
        evidenceIds: ["evidence:inventory"],
        usedByScenarioIds: ["scenario:inventory"],
        orphan: false,
      }, {
        id: "component:reconnect",
        label: "Reconnect",
        kind: "lifecycle",
        technicalRole: "player recovery",
        gameplayPurpose: "Return the player to a valid state.",
        evidenceIds: ["evidence:reconnect"],
        usedByScenarioIds: ["scenario:inventory"],
        orphan: false,
      }],
      causalLinks: [{
        id: "link:inventory-gap",
        scenarioId: "scenario:inventory",
        fromComponentId: "component:reconnect",
        toComponentId: "component:inventory",
        purpose:
          "Reconnect restores exactly one valid loadout",
        evidenceIds: ["evidence:inventory"],
        subjectIds: ["mechanic:inventory"],
        componentIds: [
          "component:inventory",
          "component:reconnect",
        ],
        knowledgeRequirementIds: [],
        impactPathComponentIds: [],
        impactPathEvidenceIds: [],
        dimensionEvidence: {},
        status: "DETECTION_GAP",
        reason:
          "Dynamic inventory mutation cannot be resolved statically.",
      }],
    });

    expect(result.status).toBe("OPEN");
    expect(result.detectionGapCausalLinkIds).toEqual([
      "link:inventory-gap",
    ]);
    expect(result.detectionGapTestRequests).toHaveLength(1);
    expect(
      result.detectionGapTestRequests[0]?.narrowTestQuestion,
    ).toContain("Reconnect restores exactly one valid loadout");
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
        knowledgeRequirementIds: [],
        impactPathComponentIds: [],
        impactPathEvidenceIds: [],
        dimensionEvidence: {},
        status: "PROVEN",
        reason: "Selected-artifact proof exists.",
      }],
    });

    expect(result.unprovenLeafScenarioIds).toEqual([]);
    expect(result.status).toBe("CLOSED");
  });

  it("keeps closure open when a scenario references an absent component", () => {
    const result = assessGameplayScenarioClosure({
      ...baseGraph(),
      scenarios: [{
        id: "scenario:missing",
        label: "missing-component",
        gameplayStage: "SETUP",
        purpose: "Bind setup components.",
        sourceSubjectIds: [],
        componentIds: ["component:absent"],
        causalLinkIds: [],
        playerCounts: [1],
        requiredKnowledgeIds: [],
        composedScenarioIds: [],
      }],
    });
    expect(result.status).toBe("OPEN");
    expect(result.reasons).toContain(
      "Missing scenario bindings: scenario:missing",
    );
  });

  it("rejects a causal link outside its owning scenario bindings", () => {
    const result = assessGameplayScenarioClosure({
      ...baseGraph(),
      scenarios: [{
        id: "scenario:arena",
        label: "arena",
        gameplayStage: "ACTIVE_GAMEPLAY",
        purpose: "Resolve arena progression.",
        sourceSubjectIds: [],
        componentIds: ["component:arena"],
        causalLinkIds: ["link:arena"],
        playerCounts: [1],
        requiredKnowledgeIds: [],
        composedScenarioIds: [],
      }],
      components: ["component:arena", "component:other"].map((id) => ({
        id,
        label: id,
        kind: "mechanic" as const,
        technicalRole: "state",
        gameplayPurpose: "Control progression.",
        evidenceIds: [],
        usedByScenarioIds: ["scenario:arena"],
        orphan: false,
      })),
      causalLinks: [{
        id: "link:arena",
        scenarioId: "scenario:arena",
        fromComponentId: "component:arena",
        toComponentId: "component:other",
        purpose: "Advance progression.",
        evidenceIds: [],
        subjectIds: [],
        componentIds: ["component:arena", "component:other"],
        knowledgeRequirementIds: [],
        impactPathComponentIds: [],
        impactPathEvidenceIds: [],
        dimensionEvidence: {},
        status: "PROVEN",
        reason: "Fixture edge.",
      }],
    });
    expect(result.status).toBe("OPEN");
    expect(result.reasons.some((reason) =>
      reason.includes("link:arena") &&
      reason.includes("outside their owning scenario"),
    )).toBe(true);
  });

  it("keeps closure open when a knowledge prerequisite is missing", () => {
    const result = assessGameplayScenarioClosure({
      ...baseGraph(),
      scenarios: [{
        id: "scenario:knowledge",
        label: "knowledge",
        gameplayStage: "MODEL",
        purpose: "Resolve required knowledge.",
        sourceSubjectIds: [],
        componentIds: [],
        causalLinkIds: [],
        playerCounts: [1],
        requiredKnowledgeIds: ["knowledge:root"],
        composedScenarioIds: [],
      }],
      knowledgeRequirements: [{
        id: "knowledge:root",
        scenarioId: "scenario:knowledge",
        domain: "chunk-simulation",
        reason: "Check simulation residency.",
        capabilityIds: [],
        dependsOnRequirementIds: ["knowledge:missing"],
        subjectIds: [],
        componentIds: [],
      }],
    });
    expect(result.status).toBe("OPEN");
    expect(result.reasons).toContain(
      "Invalid knowledge dependencies: knowledge:root",
    );
  });

  it("rejects a causal link with an absent knowledge requirement", () => {
    const graph = baseGraph();
    const result = assessGameplayScenarioClosure({
      ...graph,
      scenarios: [{
        id: "scenario:link-knowledge",
        label: "link knowledge",
        gameplayStage: "ACTIVE_GAMEPLAY",
        purpose: "Connect progression components.",
        sourceSubjectIds: [],
        componentIds: ["component:a", "component:b"],
        causalLinkIds: ["link:knowledge"],
        playerCounts: [1],
        requiredKnowledgeIds: [],
        composedScenarioIds: [],
      }],
      components: ["component:a", "component:b"].map((id) => ({
        id,
        label: id,
        kind: "mechanic" as const,
        technicalRole: "progression",
        gameplayPurpose: "Advance gameplay.",
        evidenceIds: [],
        usedByScenarioIds: ["scenario:link-knowledge"],
        orphan: false,
      })),
      causalLinks: [{
        id: "link:knowledge",
        scenarioId: "scenario:link-knowledge",
        fromComponentId: "component:a",
        toComponentId: "component:b",
        purpose: "Advance gameplay.",
        evidenceIds: [],
        subjectIds: [],
        componentIds: ["component:a", "component:b"],
        knowledgeRequirementIds: ["knowledge:absent"],
        impactPathComponentIds: [],
        impactPathEvidenceIds: [],
        dimensionEvidence: {},
        status: "PROVEN",
        reason: "Fixture link.",
      }],
    });
    expect(result.status).toBe("OPEN");
    expect(result.reasons).toContain("Invalid causal links: link:knowledge");
  });

  it("projects stage navigation without inventing systems and preserves missing links", () => {
    const model = deriveGameplayArchitectureNavigation({
      ...baseGraph(),
      scenarios: [{
        id: "scenario:lobby",
        label: "Lobby",
        gameplayStage: "ENTRY_JOIN",
        purpose: "Join.",
        sourceSubjectIds: [],
        componentIds: ["component:entry", "component:missing"],
        causalLinkIds: ["link:missing"],
        playerCounts: [1],
        requiredKnowledgeIds: [],
        composedScenarioIds: [],
      }],
      components: [{
        id: "component:entry",
        label: "Join",
        kind: "mechanic",
        technicalRole: "entry",
        gameplayPurpose: "Join map",
        evidenceIds: ["evidence:join"],
        usedByScenarioIds: ["scenario:lobby"],
        orphan: false,
      }, {
        id: "component:unplaced",
        label: "Unplaced",
        kind: "mechanic",
        technicalRole: "unclassified",
        gameplayPurpose: "",
        evidenceIds: ["evidence:other"],
        usedByScenarioIds: [],
        orphan: true,
      }],
    });
    expect(model.scenarios).toEqual([{
      id: "scenario:lobby",
      label: "Lobby",
      gameplayStage: "ENTRY_JOIN",
      purpose: "Join.",
      sourceSubjectIds: [],
      componentIds: ["component:entry", "component:missing"],
      causalLinkIds: ["link:missing"],
    }]);
    expect(model.stages[0]).toEqual({
      name: "ENTRY_JOIN",
      scenarioIds: ["scenario:lobby"],
      componentIds: ["component:entry", "component:missing"],
      causalLinkIds: ["link:missing"],
    });
    expect(model.components.find((item) => item.id === "component:entry")?.evidenceIds)
      .toEqual(["evidence:join"]);
    expect(model.knowledgeCoverage).toMatchObject({
      observedSourceIndexPercent: null,
      observedComponentPlacementPercent: 50,
      wholeGameUnderstandingPercent: null,
      wholeGameUnderstandingStatus: "NOT_MEASURABLE",
    });
    expect(model.unplacedComponentIds).toEqual(["component:unplaced"]);
    expect(model.missingGraphReferenceIds).toEqual([
      "component:missing", "link:missing",
    ]);
  });

  it("keeps arena evidence and measured source coverage distinct from whole-game knowledge", () => {
    const architecture = deriveGameplayArchitectureNavigation(
      baseGraph(),
      { relevantSourceCount: 20, indexedSourceCount: 15,
        arenaDetected: true, arenaCount: 6 },
    );
    expect(architecture.knowledgeCoverage).toEqual({
      observedSourceIndexPercent: 75,
      observedComponentPlacementPercent: null,
      wholeGameUnderstandingPercent: null,
      wholeGameUnderstandingStatus: "NOT_MEASURABLE",
      observedRelevantSourceCount: 20,
      observedIndexedSourceCount: 15,
      observedComponentCount: 0,
      observedPlacedComponentCount: 0,
      arenaEvidence: {
        detected: true,
        count: 6,
        countBasis: null,
        layoutStatus: null,
        replicaProofEntries: [],
        arenasWithoutReplicaProofCount: 6,
        declaredConcurrentArenaLimit: null,
        requestedConcurrentArenas: null,
        safeConcurrentArenas: null,
        perArenaPlayerCapacity: null,
        architectureMapping: "NOT_YET_RECONCILED",
        stateIsolationObservations: [],
        chunkLeases: [],
        cleanupAssessments: [],
        arenaSessionMapping: "NOT_YET_ESTABLISHED",
      },
    });
  });

  it("exposes observed gameplay systems without inferring absent mechanics", () => {
    const architecture = deriveGameplayArchitectureNavigation(
      baseGraph(),
      {
        relevantSourceCount: 5,
        indexedSourceCount: 5,
        arenaDetected: false,
        systemObservations: [{
          system: "ENTITY",
          observedCount: 2,
          sourceReferences: ["minecraft:pillager", "minecraft:pillager"],
        }, {
          system: "ECONOMY",
          observedCount: 0,
          sourceReferences: [],
        }],
      },
    );
    expect(architecture.systemInventory).toEqual([
      {
        system: "ECONOMY",
        observedCount: 0,
        sourceReferences: [],
        inventoryStatus: "NOT_OBSERVED",
        architectureMapping: "NOT_YET_RECONCILED",
      },
      {
        system: "ENTITY",
        observedCount: 2,
        sourceReferences: ["minecraft:pillager"],
        inventoryStatus: "OBSERVED",
        architectureMapping: "NOT_YET_RECONCILED",
      },
    ]);
    expect(architecture.knowledgeCoverage.wholeGameUnderstandingPercent).toBeNull();
  });

  it("preserves physical arena inventory separately from scenario placement", () => {
    const architecture = deriveGameplayArchitectureNavigation(
      baseGraph(),
      {
        relevantSourceCount: 3,
        indexedSourceCount: 3,
        arenaDetected: true,
        arenaCount: 3,
        arenaCountBasis: "reconciled",
        arenaLayoutStatus: "resolved",
        requestedConcurrentArenas: 3,
        safeConcurrentArenas: 2,
        replicaProof: [{
          arenaId: "arena:1",
          evidenceIds: ["native:a1", "native:a1"],
          status: "complete-proof",
        }, {
          arenaId: "arena:2",
          evidenceIds: ["native:a2"],
          status: "incomplete-proof",
        }],
        declaredConcurrentArenaLimit: 2,
        perArenaPlayerCapacity: 5,
        stateIsolationObservations: [{
          scriptId: "script:arena", region: "region:ready", key: "ready",
          status: "shared-global",
        }],
        chunkLeases: [{
          scriptId: "script:arena", leaseKey: "arena:lease",
          acquireRegions: ["region:setup"], releaseRegions: ["region:cleanup"],
          status: "paired",
        }],
        cleanupAssessments: [{
          scriptId: "script:arena", tableName: "sessionTable",
          status: "unresolved", missingPhases: ["cleanup"],
          orderingViolations: [],
        }],
      },
    );
    expect(architecture.knowledgeCoverage.arenaEvidence).toEqual({
      detected: true,
      count: 3,
      countBasis: "reconciled",
      layoutStatus: "resolved",
      replicaProofEntries: [
        { arenaId: "arena:1", evidenceIds: ["native:a1"], proofStatus: "complete-proof" },
        { arenaId: "arena:2", evidenceIds: ["native:a2"], proofStatus: "incomplete-proof" },
      ],
      arenasWithoutReplicaProofCount: 1,
      declaredConcurrentArenaLimit: 2,
      requestedConcurrentArenas: 3,
      safeConcurrentArenas: 2,
      perArenaPlayerCapacity: 5,
      architectureMapping: "NOT_YET_RECONCILED",
      stateIsolationObservations: [{
        scriptId: "script:arena", region: "region:ready", key: "ready",
        status: "shared-global",
      }],
      chunkLeases: [{
        scriptId: "script:arena", leaseKey: "arena:lease",
        acquireRegions: ["region:setup"], releaseRegions: ["region:cleanup"],
        status: "paired",
      }],
      cleanupAssessments: [{
        scriptId: "script:arena", tableName: "sessionTable",
        status: "unresolved", missingPhases: ["cleanup"],
        orderingViolations: [],
      }],
      arenaSessionMapping: "NOT_YET_ESTABLISHED",
    });
    expect(architecture.knowledgeCoverage.wholeGameUnderstandingPercent).toBeNull();
  });
});
