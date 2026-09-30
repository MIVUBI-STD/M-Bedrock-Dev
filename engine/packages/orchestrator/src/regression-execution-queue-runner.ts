import type {
  RegressionExecutionQueue,
  RegressionExecutionQueueItem,
} from "../../reliability/src/index.js";
import {
  executeCounterexampleScenarioWithGate,
  type CounterexampleScenario,
  type CounterexampleScenarioExecutor,
  type RuntimeActionCapabilityRegistry,
  type RuntimeExperimentMutationRisk,
} from "../../runtime-lab/src/index.js";
import type {
  DiagnosticExecutionContext,
} from "../../project-model/src/index.js";

export type RegressionBatchItemStatus =
  | "passed"
  | "regressed"
  | "blocked"
  | "manual-required";

export interface RegressionRuntimeObservation {
  originalDefectReproduced: boolean;
  evidenceIds: readonly string[];
}

export interface RegressionBatchItemResult {
  regressionId: string;
  scenarioId?: string;
  status: RegressionBatchItemStatus;
  evidenceIds: readonly string[];
  reasons: readonly string[];
}

export interface RegressionBatchRunResult {
  mapId: string;
  updateVersion: string;
  passed: readonly RegressionBatchItemResult[];
  regressed: readonly RegressionBatchItemResult[];
  blocked: readonly RegressionBatchItemResult[];
  manualRequired: readonly RegressionBatchItemResult[];
}

export interface RegressionScenarioResolver {
  resolve(
    scenarioId: string,
  ): CounterexampleScenario | undefined;
}

export interface RegressionExecutionQueueRunInput {
  queue: RegressionExecutionQueue;
  resolver: RegressionScenarioResolver;
  announcedCapabilities?: RuntimeActionCapabilityRegistry;
  context: Extract<
    DiagnosticExecutionContext,
    "LOCAL_MINECRAFT" | "LIVE_MINECRAFT"
  >;
  mutationRisk: Exclude<
    RuntimeExperimentMutationRisk,
    "read-only"
  >;
  runtimeProfileMatches: boolean;
}

function manualResult(
  item: RegressionExecutionQueueItem,
): RegressionBatchItemResult {
  return {
    regressionId: item.regressionId,
    status: "manual-required",
    evidenceIds: [],
    reasons: [...item.reasons],
  };
}

export async function runRegressionExecutionQueue(
  input: RegressionExecutionQueueRunInput,
  executor:
    CounterexampleScenarioExecutor<RegressionRuntimeObservation>,
): Promise<RegressionBatchRunResult> {
  const passed: RegressionBatchItemResult[] = [];
  const regressed: RegressionBatchItemResult[] = [];
  const blocked: RegressionBatchItemResult[] = [];
  const manualRequired =
    input.queue.manualRequired.map(manualResult);

  for (const item of input.queue.runtimeReady) {
    const scenarioId = item.scenarioId;
    if (!scenarioId) {
      blocked.push({
        regressionId: item.regressionId,
        status: "blocked",
        evidenceIds: [],
        reasons: [
          "Runtime-ready regression is missing scenarioId.",
        ],
      });
      continue;
    }

    const scenario =
      input.resolver.resolve(scenarioId);
    if (!scenario) {
      blocked.push({
        regressionId: item.regressionId,
        scenarioId,
        status: "blocked",
        evidenceIds: [],
        reasons: [
          "Runtime scenario could not be resolved: " +
            scenarioId +
            ".",
        ],
      });
      continue;
    }

    const gated =
      await executeCounterexampleScenarioWithGate(
        {
          scenario,
          ...(input.announcedCapabilities === undefined
            ? {}
            : {
                announcedCapabilities:
                  input.announcedCapabilities,
              }),
          context: input.context,
          mutationRisk: input.mutationRisk,
          runtimeProfileMatches:
            input.runtimeProfileMatches,
        },
        executor,
      );

    if (gated.status === "blocked") {
      blocked.push({
        regressionId: item.regressionId,
        scenarioId,
        status: "blocked",
        evidenceIds: [],
        reasons: [
          ...gated.plan.reasons,
          ...gated.plan.validationErrors,
          ...(gated.plan.missingActionIds.length === 0
            ? []
            : [
                "Missing runtime actions: " +
                  gated.plan.missingActionIds.join(", ") +
                  ".",
              ]),
        ],
      });
      continue;
    }

    const observation = gated.result;
    if (!observation) {
      blocked.push({
        regressionId: item.regressionId,
        scenarioId,
        status: "blocked",
        evidenceIds: [],
        reasons: [
          "Runtime scenario execution returned no regression observation.",
        ],
      });
      continue;
    }

    if (observation.evidenceIds.length === 0) {
      blocked.push({
        regressionId: item.regressionId,
        scenarioId,
        status: "blocked",
        evidenceIds: [],
        reasons: [
          "Runtime regression result requires explicit evidence ids.",
        ],
      });
      continue;
    }

    const result: RegressionBatchItemResult = {
      regressionId: item.regressionId,
      scenarioId,
      status:
        observation.originalDefectReproduced
          ? "regressed"
          : "passed",
      evidenceIds:
        [...new Set(observation.evidenceIds)].sort(),
      reasons: [
        observation.originalDefectReproduced
          ? "Historical defect reproduced on the current target."
          : "Historical defect did not reproduce on the current target.",
      ],
    };

    if (result.status === "regressed") {
      regressed.push(result);
    } else {
      passed.push(result);
    }
  }

  return {
    mapId: input.queue.mapId,
    updateVersion: input.queue.updateVersion,
    passed,
    regressed,
    blocked,
    manualRequired,
  };
}
