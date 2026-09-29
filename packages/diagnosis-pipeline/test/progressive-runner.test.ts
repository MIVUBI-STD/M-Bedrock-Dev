import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  createInMemoryDiagnosisResultCache,
  runProgressiveDiagnosis,
  type DiagnosisCapabilityExecutor,
} from "../src/index.js";

function executor(
  executorId: string,
  level:
    | "static"
    | "semantic",
  trait:
    | "structural-proof"
    | "intent-grounded",
): DiagnosisCapabilityExecutor {
  return {
    executorId,
    execute: vi.fn(async () => ({
      status: "completed" as const,
      output: {
        executorId,
      },
      evidence: [{
        level,
        quality: "usable" as const,
        traits: [trait],
        evidenceIds: [
          executorId + ":evidence",
        ],
      }],
    })),
  };
}

describe("progressive diagnosis runner", () => {
  it("takes the minimum sufficient route and skips semantic IR when intent grounding closes the goal directly", async () => {
    const source =
      executor(
        "diagnosis.source-index",
        "static",
        "structural-proof",
      );
    const intent =
      executor(
        "diagnosis.intent-grounding",
        "semantic",
        "intent-grounded",
      );
    const semantic = {
      executorId:
        "diagnosis.semantic-ir",
      execute: vi.fn(async () => ({
        status: "completed" as const,
        output: {},
        evidence: [{
          level: "semantic" as const,
          quality: "usable" as const,
          traits: [
            "semantic-model" as const,
          ],
          evidenceIds: ["semantic:e1"],
        }],
      })),
    };

    const result =
      await runProgressiveDiagnosis({
        goal: "intent-classification",
        relevantTags: ["session"],
        context: "LOCAL_ARTIFACT",
        executorRegistry: {
          schemaVersion: 1,
          executors: [
            source,
            semantic,
            intent,
          ],
        },
        payloadProvider: {
          payloadFor: () => ({}),
        },
      });

    expect(result.status).toBe(
      "sufficient",
    );
    expect(
      result.executions.map(
        (item) => item.capabilityId,
      ),
    ).toEqual([
      "diagnosis.source-index",
      "diagnosis.intent-grounding",
    ]);
    expect(
      semantic.execute,
    ).not.toHaveBeenCalled();
  });

  it("does not execute runtime work from local artifact context", async () => {
    const result =
      await runProgressiveDiagnosis({
        goal: "runtime-behavior",
        relevantTags: ["session"],
        context: "LOCAL_ARTIFACT",
        executorRegistry: {
          schemaVersion: 1,
          executors: [],
        },
        payloadProvider: {
          payloadFor: vi.fn(),
        },
      });

    expect(result.status).toBe(
      "requires-runtime-context",
    );
    expect(result.executions)
      .toEqual([]);
  });

  it("stops immediately when an executor reports an evidence or coverage block", async () => {
    const result =
      await runProgressiveDiagnosis({
        goal: "intent-classification",
        relevantTags: ["session"],
        context: "LOCAL_ARTIFACT",
        executorRegistry: {
          schemaVersion: 1,
          executors: [{
            executorId:
              "diagnosis.source-index",
            execute: async () => ({
              status: "blocked",
              output: {
                partial: true,
              },
              reasons: [
                "coverage incomplete",
              ],
            }),
          }],
        },
        payloadProvider: {
          payloadFor: () => ({}),
        },
      });

    expect(result.status).toBe(
      "blocked",
    );
    expect(result.executions)
      .toHaveLength(1);
    expect(
      result.outputs[
        "diagnosis.source-index"
      ],
    ).toEqual({ partial: true });
  });

  it("enforces a hard step bound", async () => {
    const source =
      executor(
        "diagnosis.source-index",
        "static",
        "structural-proof",
      );

    const result =
      await runProgressiveDiagnosis({
        goal: "intent-classification",
        relevantTags: ["session"],
        context: "LOCAL_ARTIFACT",
        executorRegistry: {
          schemaVersion: 1,
          executors: [source],
        },
        payloadProvider: {
          payloadFor: () => ({}),
        },
        maxSteps: 1,
      });

    expect(result.status).toBe(
      "blocked",
    );
    expect(result.reasons.join(" "))
      .toMatch(/step limit/);
  });

  it("reuses deterministic capability results for identical inputs and revisions", async () => {
    const cache =
      createInMemoryDiagnosisResultCache();
    const firstSource =
      executor(
        "diagnosis.source-index",
        "static",
        "structural-proof",
      );
    const firstIntent =
      executor(
        "diagnosis.intent-grounding",
        "semantic",
        "intent-grounded",
      );

    const first =
      await runProgressiveDiagnosis({
        goal: "intent-classification",
        relevantTags: ["session"],
        context: "LOCAL_ARTIFACT",
        executorRegistry: {
          schemaVersion: 1,
          executors: [
            firstSource,
            firstIntent,
          ],
        },
        payloadProvider: {
          payloadFor: (input) => ({
            capabilityId:
              input.capabilityId,
            artifact: "same",
          }),
        },
        resultCache: cache,
      });

    expect(first.status).toBe(
      "sufficient",
    );

    const secondSource =
      executor(
        "diagnosis.source-index",
        "static",
        "structural-proof",
      );
    const secondIntent =
      executor(
        "diagnosis.intent-grounding",
        "semantic",
        "intent-grounded",
      );

    const second =
      await runProgressiveDiagnosis({
        goal: "intent-classification",
        relevantTags: ["session"],
        context: "LOCAL_ARTIFACT",
        executorRegistry: {
          schemaVersion: 1,
          executors: [
            secondSource,
            secondIntent,
          ],
        },
        payloadProvider: {
          payloadFor: (input) => ({
            capabilityId:
              input.capabilityId,
            artifact: "same",
          }),
        },
        resultCache: cache,
      });

    expect(second.status).toBe(
      "sufficient",
    );
    expect(
      second.executions.every(
        (item) =>
          item.status === "executed" &&
          item.reused === true,
      ),
    ).toBe(true);
    expect(
      secondSource.execute,
    ).not.toHaveBeenCalled();
    expect(
      secondIntent.execute,
    ).not.toHaveBeenCalled();
  });

  it("invalidates deterministic reuse when the payload changes", async () => {
    const cache =
      createInMemoryDiagnosisResultCache();
    const source =
      executor(
        "diagnosis.source-index",
        "static",
        "structural-proof",
      );

    const run = async (
      artifact: string,
    ) =>
      await runProgressiveDiagnosis({
        goal:
          "structural-consistency",
        relevantTags: ["artifact"],
        context: "LOCAL_ARTIFACT",
        executorRegistry: {
          schemaVersion: 1,
          executors: [source],
        },
        payloadProvider: {
          payloadFor: () => ({
            artifact,
          }),
        },
        resultCache: cache,
      });

    await run("a");
    await run("b");

    expect(source.execute)
      .toHaveBeenCalledTimes(2);
  });

});
