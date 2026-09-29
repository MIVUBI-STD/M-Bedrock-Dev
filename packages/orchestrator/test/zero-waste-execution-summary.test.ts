import {
  describe,
  expect,
  it,
} from "vitest";
import {
  summarizeZeroWasteExecution,
  zeroWasteExecutionSummaryText,
} from "../src/zero-waste-execution-summary.js";
import type {
  ProgressiveDiagnosisRunResult,
} from "../../diagnosis-pipeline/src/index.js";

describe("zero-waste execution summary", () => {
  it("reports reuse and skip ratios without changing execution authority", () => {
    const diagnosis = {
      status: "sufficient",
      goal: "semantic-consistency",
      finalPlan: {
        goal:
          "semantic-consistency",
        requiredEvidenceLevel:
          "semantic",
        requiredEvidenceTraits: [
          "semantic-model",
        ],
        currentEvidenceLevel:
          "semantic",
        missingEvidenceTraits: [],
        disposition:
          "stop-sufficient",
        steps: [],
        skippedCapabilityIds: [],
        reasons: [],
      },
      completedCapabilityIds: [],
      evidence: [],
      outputs: {},
      executions: [
        {
          status: "executed",
          capabilityId: "a",
          executorId: "a",
          evidence: [],
          output: {},
          reasons: [],
          reused: false,
        },
        {
          status: "executed",
          capabilityId: "b",
          executorId: "b",
          evidence: [],
          output: {},
          reasons: [],
          reused: true,
        },
      ],
      reasons: [],
    } satisfies ProgressiveDiagnosisRunResult;

    const summary =
      summarizeZeroWasteExecution(
        diagnosis,
        {
          status: "planned",
          changedNodeIds: ["n1"],
          affectedNodeIds: ["n1"],
          skippedNodeIds: [
            "n2",
            "n3",
          ],
          affectedPaths: ["a.ts"],
          totalNodeCount: 3,
          changedNodeCount: 1,
          affectedNodeCount: 1,
          skippedNodeCount: 2,
          skipRatio: 2 / 3,
          reasons: [],
        },
        {
          status: "planned",
          selected: [],
          skipped: [],
          totalScenarioCount: 4,
          selectedScenarioCount: 1,
          skippedScenarioCount: 3,
          skipRatio: 0.75,
          affectedNodeCount: 1,
          affectedPathCount: 1,
          reasons: [],
          errors: [],
        },
      );

    expect(
      summary.diagnosis.reusedSteps,
    ).toBe(1);
    expect(
      summary.semanticImpact
        ?.skippedNodes,
    ).toBe(2);
    expect(
      summary.validation
        ?.skippedScenarios,
    ).toBe(3);

    const text =
      zeroWasteExecutionSummaryText(
        summary,
      );
    expect(text)
      .toContain("reuse ratio: 50.0%");
    expect(text)
      .toContain("skip ratio: 75.0%");
  });
});
