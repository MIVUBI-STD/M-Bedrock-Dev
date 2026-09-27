import {
  describe,
  expect,
  it,
} from "vitest";
import {
  planMinimumSufficientAnalysis,
  requiredEvidenceLevelForGoal,
  type AnalysisCapability,
} from "../src/index.js";

const capabilities: AnalysisCapability[] = [{
  id: "manifest",
  evidenceLevel: "metadata",
  cost: "cheap",
  tags: ["artifact"],
  deterministic: true,
  contexts: [
    "LOCAL_ARTIFACT",
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
}, {
  id: "source-graph",
  evidenceLevel: "static",
  cost: "cheap",
  tags: ["session", "state"],
  deterministic: true,
  contexts: [
    "LOCAL_ARTIFACT",
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
}, {
  id: "semantic-lifecycle",
  evidenceLevel: "semantic",
  cost: "moderate",
  tags: ["session", "state"],
  deterministic: true,
  contexts: [
    "LOCAL_ARTIFACT",
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
}, {
  id: "expensive-semantic",
  evidenceLevel: "semantic",
  cost: "expensive",
  tags: ["session"],
  deterministic: true,
  contexts: ["LOCAL_ARTIFACT"],
}, {
  id: "formal-search",
  evidenceLevel: "formal",
  cost: "expensive",
  tags: ["session", "state"],
  deterministic: true,
  contexts: [
    "LOCAL_ARTIFACT",
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
}, {
  id: "runtime-probe",
  evidenceLevel: "runtime",
  cost: "expensive",
  tags: ["session", "state"],
  deterministic: false,
  contexts: [
    "LOCAL_MINECRAFT",
    "LIVE_MINECRAFT",
  ],
}, {
  id: "controlled-intervention",
  evidenceLevel: "intervention",
  cost: "very-expensive",
  tags: ["session"],
  deterministic: false,
  contexts: ["LIVE_MINECRAFT"],
}, {
  id: "dialogue-analyzer",
  evidenceLevel: "semantic",
  cost: "cheap",
  tags: ["dialogue"],
  deterministic: true,
  contexts: ["LOCAL_ARTIFACT"],
}];

describe(
  "minimum sufficient analysis planner",
  () => {
    it(
      "stops immediately when existing evidence is already sufficient",
      () => {
        const plan =
          planMinimumSufficientAnalysis({
            goal: "semantic-consistency",
            relevantTags: ["session"],
            context: "LOCAL_ARTIFACT",
            availableEvidence: [{
              level: "semantic",
              evidenceIds: ["semantic:e1"],
            }],
            capabilities,
          });

        expect(plan.disposition).toBe(
          "stop-sufficient",
        );
        expect(plan.steps).toEqual([]);
      },
    );

    it(
      "selects the cheapest relevant route and skips unrelated analyzers",
      () => {
        const plan =
          planMinimumSufficientAnalysis({
            goal: "intent-classification",
            relevantTags: [
              "session",
              "state",
            ],
            context: "LOCAL_ARTIFACT",
            capabilities,
          });

        expect(
          plan.steps.map(
            (item) => item.capabilityId,
          ),
        ).toEqual([
          "source-graph",
          "semantic-lifecycle",
        ]);
        expect(
          plan.skippedCapabilityIds,
        ).toContain("dialogue-analyzer");
        expect(
          plan.skippedCapabilityIds,
        ).toContain("expensive-semantic");
      },
    );

    it(
      "requires Minecraft context instead of pretending static analysis can prove runtime behavior",
      () => {
        const plan =
          planMinimumSufficientAnalysis({
            goal: "runtime-behavior",
            relevantTags: ["session"],
            context: "LOCAL_ARTIFACT",
            capabilities,
          });

        expect(plan.disposition).toBe(
          "requires-runtime-context",
        );
      },
    );

    it(
      "escalates only above already-proven evidence levels",
      () => {
        const plan =
          planMinimumSufficientAnalysis({
            goal: "runtime-behavior",
            relevantTags: ["session"],
            context: "LOCAL_MINECRAFT",
            availableEvidence: [{
              level: "formal",
              evidenceIds: ["formal:e1"],
            }],
            capabilities,
          });

        expect(
          plan.steps.map(
            (item) => item.capabilityId,
          ),
        ).toEqual([
          "runtime-probe",
        ]);
      },
    );

    it(
      "requires intervention evidence for causal repair authority",
      () => {
        expect(
          requiredEvidenceLevelForGoal(
            "causal-repair",
          ),
        ).toBe("intervention");

        const plan =
          planMinimumSufficientAnalysis({
            goal: "causal-repair",
            relevantTags: ["session"],
            context: "LIVE_MINECRAFT",
            availableEvidence: [{
              level: "runtime",
              evidenceIds: ["runtime:e1"],
            }],
            capabilities,
          });

        expect(
          plan.steps.map(
            (item) => item.capabilityId,
          ),
        ).toEqual([
          "controlled-intervention",
        ]);
      },
    );
  },
);
