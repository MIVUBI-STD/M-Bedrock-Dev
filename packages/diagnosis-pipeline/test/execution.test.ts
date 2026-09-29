import {
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  planMinimumSufficientAnalysis,
} from "../../analysis-planner/src/index.js";
import {
  DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY,
  executePlannedDiagnosisStep,
  validateDiagnosisExecutorRegistry,
  type DiagnosisExecutorRegistry,
} from "../src/index.js";

function plan() {
  return planMinimumSufficientAnalysis({
    goal: "intent-classification",
    relevantTags: ["session"],
    context: "LOCAL_ARTIFACT",
    capabilities:
      DIAGNOSIS_ANALYSIS_CAPABILITY_REGISTRY
        .capabilities,
  });
}

describe("diagnosis planned-step execution", () => {
  it("executes only the explicitly planned canonical executor", async () => {
    const execute = vi.fn(async () => ({
      status: "completed" as const,
      evidence: [{
        level: "static" as const,
        evidenceIds: ["source:e1"],
        quality: "usable" as const,
        traits: ["structural-proof" as const],
      }],
      output: { indexed: true },
    }));

    const result =
      await executePlannedDiagnosisStep({
        plan: plan(),
        context: "LOCAL_ARTIFACT",
        payload: { artifactId: "a" },
        registry: {
          schemaVersion: 1,
          executors: [{
            executorId:
              "diagnosis.source-index",
            execute,
          }],
        },
      });

    expect(result.status).toBe(
      "executed",
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("blocks executors that overclaim completion without declared evidence traits", async () => {
    const result =
      await executePlannedDiagnosisStep({
        plan: plan(),
        context: "LOCAL_ARTIFACT",
        payload: {},
        registry: {
          schemaVersion: 1,
          executors: [{
            executorId:
              "diagnosis.source-index",
            execute: async () => ({
              status: "completed",
              evidence: [{
                level: "static",
                evidenceIds: ["source:e1"],
                quality: "usable",
                traits: [],
              }],
              output: {},
            }),
          }],
        },
      });

    expect(result.status).toBe(
      "blocked",
    );
    expect(result.reasons.join(" "))
      .toMatch(/declared evidence trait/);
  });

  it("does not execute a missing or unrelated executor", async () => {
    const result =
      await executePlannedDiagnosisStep({
        plan: plan(),
        context: "LOCAL_ARTIFACT",
        payload: {},
        registry: {
          schemaVersion: 1,
          executors: [],
        },
      });

    expect(result.status).toBe(
      "blocked",
    );
    expect(result.reasons.join(" "))
      .toMatch(/No executor is registered/);
  });

  it("fails open when cache-key generation cannot canonicalize the payload", async () => {
    const execute = vi.fn(async () => ({
      status: "completed" as const,
      evidence: [{
        level: "static" as const,
        evidenceIds: ["source:e1"],
        quality: "usable" as const,
        traits: ["structural-proof" as const],
      }],
      output: { indexed: true },
    }));

    const result =
      await executePlannedDiagnosisStep({
        plan: plan(),
        context: "LOCAL_ARTIFACT",
        payload: {
          unsupported:
            () => "not-cacheable",
        },
        registry: {
          schemaVersion: 1,
          executors: [{
            executorId:
              "diagnosis.source-index",
            execute,
          }],
        },
        cache: {
          get: () => undefined,
          put: () => undefined,
        },
      });

    expect(result.status)
      .toBe("executed");
    expect(execute)
      .toHaveBeenCalledTimes(1);
    expect(
      result.status === "executed"
        ? result.reasons.join(" ")
        : "",
    ).toMatch(/cache key generation failed/i);
  });

  it("rejects executor ids outside the canonical diagnosis profile", () => {
    const registry: DiagnosisExecutorRegistry = {
      schemaVersion: 1,
      executors: [{
        executorId: "random.executor",
        execute: async () => ({
          status: "blocked",
          reasons: ["unused"],
        }),
      }],
    };

    expect(
      validateDiagnosisExecutorRegistry(
        registry,
      ).join(" "),
    ).toMatch(/not declared/);
  });
});
