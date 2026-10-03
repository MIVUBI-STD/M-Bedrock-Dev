import { describe, expect, it } from "vitest";
import {
  groupReadyAuditIssuesForCandidateCoverage,
} from "../src/map-audit-candidate-grouping.js";
import type {
  GameplayScenarioGraph,
} from "../src/inspection/gameplay-scenario-model.js";
import type {
  ReadyAuditIssueProjection,
} from "../src/map-audit-issue-projection.js";

const graph: GameplayScenarioGraph = {
  schemaVersion: 1,
  policy: "scenario-driven-causal-audit",
  scenarios: [],
  components: [],
  causalLinks: [{
    id: "link:wave",
    scenarioId: "scenario:wave",
    fromComponentId: "runtime:chunks",
    toComponentId: "objective:wave",
    purpose: "Keep wave actors simulated until completion.",
    evidenceIds: ["e:chunk", "e:entity"],
    subjectIds: ["objective:wave"],
    componentIds: [
      "runtime:chunks",
      "runtime:entities",
    ],
    status: "CONTRADICTED",
    reason: "Remote wave actors can stop simulating.",
  }],
  knowledgeRequirements: [],
  knowledgeReceipts: [],
  requiredInspectionGraph: {
    policy: "required-inspection-graph",
    nodes: [],
    receipts: [],
  },
};

const issue: ReadyAuditIssueProjection = {
  issueType: "BUG",
  failureDomain:
    "progression-wave-objective",
  contributingDomains: [
    "chunk-simulation",
    "entity-ai-combat",
    "progression-wave-objective",
  ],
  gameplayFlow: "PROGRESSION",
  causalLinkId: "link:wave",
  scenarioId: "scenario:wave",
  gameplayStage: "PROGRESSION",
  scenarioLabel: "wave-progression",
  gameplayTrigger: "Run a remote wave.",
  gameplayConsequence:
    "The wave can never complete.",
  expectedOutcome:
    "All required wave actors remain simulated.",
  actualOutcome:
    "Remote actors can stop simulation.",
  affectedScope: "wave progression",
  subjectIds: ["objective:wave"],
  componentIds: [
    "runtime:chunks",
    "runtime:entities",
  ],
  evidenceIds: ["e:chunk", "e:entity"],
};

describe("map audit candidate grouping", () => {
  it("preserves gameplay flow and cross-system domain context", () => {
    const [group] =
      groupReadyAuditIssuesForCandidateCoverage(
        graph,
        [issue],
      );

    expect(group).toMatchObject({
      issueType: "BUG",
      gameplayFlows: ["PROGRESSION"],
      failureDomains: [
        "progression-wave-objective",
      ],
      contributingDomains: [
        "chunk-simulation",
        "entity-ai-combat",
        "progression-wave-objective",
      ],
    });
  });
});
