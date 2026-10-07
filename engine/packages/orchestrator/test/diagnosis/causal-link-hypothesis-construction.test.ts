import { describe, expect, it } from "vitest";
import { constructCausalLinkHypothesis } from "../../src/diagnosis/causal-link-hypothesis-construction.js";

describe("causal link hypothesis construction", () => {
  it("binds scenario knowledge claims into the causal proof predicates", () => {
    const result = constructCausalLinkHypothesis({
      graph: {
        schemaVersion: 1,
        policy: "scenario-driven-causal-audit",
        scenarios: [{
          id: "s1",
          label: "Anything",
          gameplayStage: "PROGRESSION",
          purpose: "Complete objective",
          sourceSubjectIds: [],
          componentIds: ["c1"],
          causalLinkIds: ["l1"],
          playerCounts: [1],
          requiredKnowledgeIds: ["k1"],
          composedScenarioIds: [],
        }],
        components: [],
        causalLinks: [{
          id: "l1",
          scenarioId: "s1",
          fromComponentId: "c1",
          toComponentId: "c2",
          purpose: "Dependency must resolve",
          evidenceIds: ["e1"],
          subjectIds: ["subject"],
          componentIds: ["c1"],
          knowledgeRequirementId: "k1",
          status: "CONTRADICTED",
          reason: "Dependency is contradicted",
        }],
        knowledgeRequirements: [{
          id: "k1",
          scenarioId: "s1",
          domain: "platform-constraints",
          reason: "Need applicable platform semantics",
          capabilityIds: [],
          dependsOnRequirementIds: [],
          subjectIds: ["subject"],
          componentIds: ["c1"],
        }],
        knowledgeReceipts: [{
          requirementId: "k1",
          scenarioId: "s1",
          domain: "platform-constraints",
          status: "SATISFIED",
          evidenceIds: ["analysis:platform-constraints"],
          knowledgeIds: ["chunks.relation.player-proximity-activates-simulation"],
          capabilityIdsUsed: ["analysis:platform-constraints"],
          subjectIds: ["subject"],
          componentIds: ["c1"],
          reason: "Applicable platform claim is present.",
        }],
        requiredInspectionGraph: {
          policy: "required-inspection-graph",
          nodes: [],
          receipts: [],
        },
      },
      resolution: {
        causalLinkId: "l1",
        scenarioId: "s1",
        knowledgeRequirementId: "k1",
        evidenceIds: ["e1"],
        disposition: "RUNTIME_PROOF_REQUIRED",
        runtimeReason: "Runtime needed",
        narrowRuntimeQuestion: "Is target ready?",
      },
    });

    expect(result?.hypothesisSet.hypotheses[0]).toMatchObject({
      id: "causal-link-defect:l1",
      requiredPredicates: [
        "causal-link:l1:contradiction:none",
        "causal-link:l1:runtime:none",
        "causal-link:l1:knowledge:k1",
        "causal-link:l1:knowledge:chunks.relation.player-proximity-activates-simulation",
      ],
      falsifierPredicates: ["causal-link:l1:counterproof:none"],
    });
  });
});
