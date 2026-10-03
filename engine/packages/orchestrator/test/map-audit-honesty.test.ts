import { describe, expect, it } from "vitest";
import {
  assessAuditHonesty,
} from "../src/map-audit-honesty.js";
import type {
  GameplayScenarioGraph,
} from "../src/inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "../src/inspection/gameplay-defect-resolution.js";
import type {
  AuditIssueProjection,
} from "../src/map-audit-issue-projection.js";

const graph: GameplayScenarioGraph = {
  schemaVersion: 1,
  policy: "scenario-driven-causal-audit",
  scenarios: [{
    id: "scenario:wave",
    label: "wave",
    gameplayStage: "PROGRESSION",
    purpose: "Complete the wave.",
    sourceSubjectIds: ["objective:wave"],
    componentIds: ["runtime:entities"],
    causalLinkIds: ["link:wave"],
    playerCounts: [1],
    requiredKnowledgeIds: [],
    composedScenarioIds: [],
  }],
  components: [{
    id: "runtime:entities",
    label: "Entities",
    kind: "runtime-domain",
    technicalRole: "entity runtime",
    gameplayPurpose: "Drive wave progression.",
    evidenceIds: ["e:entity"],
    usedByScenarioIds: ["scenario:wave"],
    orphan: false,
  }],
  causalLinks: [{
    id: "link:wave",
    scenarioId: "scenario:wave",
    fromComponentId: "runtime:entities",
    toComponentId: "objective:wave",
    purpose: "Enemy remains simulated until completion.",
    evidenceIds: ["e:entity"],
    subjectIds: ["objective:wave"],
    componentIds: ["runtime:entities"],
    status: "RUNTIME_BLOCKED",
    reason: "Runtime residency is unresolved.",
  }],
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

const closure = {
  status: "CLOSED" as const,
  surfaces: [],
  unaccountedSurfaceIds: [],
  blockingSurfaceIds: [],
  unknownSurfaceIds: [],
  stateModelComplete: true,
  boundariesExtracted: true,
  reasons: [],
};

function visibleRuntimeFinding(): AuditIssueProjection {
  return {
    status: "NEED_VALIDATION",
    issueType: "BUG",
    failureDomain: "progression-wave-objective",
    contributingDomains: [
      "progression-wave-objective",
    ],
    gameplayFlow: "PROGRESSION",
    informationMismatch: false,
    playerFacingEvidenceIds: [],
    causalLinkId: "link:wave",
    scenarioId: "scenario:wave",
    gameplayStage: "PROGRESSION",
    scenarioLabel: "wave",
    gameplayTrigger: "Complete the wave.",
    gameplayConsequence: "Wave may block.",
    expectedOutcome:
      "Enemy remains simulated until completion.",
    actualOutcome:
      "Runtime residency is unresolved.",
    affectedScope: "objective:wave",
    subjectIds: ["objective:wave"],
    componentIds: ["runtime:entities"],
    evidenceIds: ["e:entity"],
    validationReason: "Runtime proof required.",
    missingProof: "Observed runtime residency.",
    validationTest:
      "Run the wave and observe the remote enemy.",
    validationGroupKey:
      "scenario:wave:chunk-simulation",
  };
}

describe("map audit honesty gate", () => {
  it("passes only when every tracked unresolved residue is visible", () => {
    const result = assessAuditHonesty({
      graph,
      gate,
      gameplayClosure: closure,
      negativeSpace: [],
      temporalRisks: [],
      discoveryChallenges: [],
      sharedResourceSignals: [],
      compoundBoundaries: [],
      accumulationGrowth: [],
      visibleIssues: [visibleRuntimeFinding()],
    });

    expect(result.status).toBe("PASS");
    expect(
      result.missingVisibleResidueIds,
    ).toEqual([]);
  });

  it("blocks review when a material unresolved residue is hidden", () => {
    const result = assessAuditHonesty({
      graph,
      gate,
      gameplayClosure: closure,
      negativeSpace: [],
      temporalRisks: [],
      discoveryChallenges: [],
      sharedResourceSignals: [],
      compoundBoundaries: [],
      accumulationGrowth: [],
      visibleIssues: [],
    });

    expect(result.status).toBe("VIOLATION");
    expect(
      result.missingVisibleResidueIds,
    ).toEqual(["link:wave"]);
  });
});
