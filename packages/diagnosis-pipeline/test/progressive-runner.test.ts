import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
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
});
