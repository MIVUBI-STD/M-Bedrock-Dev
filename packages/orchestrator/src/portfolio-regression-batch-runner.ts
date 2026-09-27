import type {
  PortfolioRegressionSchedule,
  PortfolioRegressionScheduleItem,
  RetestPriority,
} from "../../reliability/src/index.js";
import type {
  CounterexampleScenarioExecutor,
  RuntimeActionCapabilityRegistry,
  RuntimeExperimentMutationRisk,
} from "../../runtime-lab/src/index.js";
import type {
  DiagnosticExecutionContext,
} from "../../project-model/src/index.js";
import {
  applyRegressionBatchRetestFeedback,
  type RegressionBatchRetestFeedback,
} from "./regression-batch-retest-feedback.js";
import {
  runRegressionExecutionQueue,
  type RegressionBatchRunResult,
  type RegressionRuntimeObservation,
  type RegressionScenarioResolver,
} from "./regression-execution-queue-runner.js";

export interface PortfolioRegressionRuntimeTarget {
  resolver: RegressionScenarioResolver;
  executor:
    CounterexampleScenarioExecutor<RegressionRuntimeObservation>;
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

export interface PortfolioRegressionRuntimeProvider {
  forMap(
    mapId: string,
  ): PortfolioRegressionRuntimeTarget | undefined;
}

export interface PortfolioRegressionMapRunResult {
  mapId: string;
  scheduledPriority: RetestPriority;
  batch: RegressionBatchRunResult;
  feedback: RegressionBatchRetestFeedback;
}

export interface PortfolioRegressionBatchRunResult {
  updateVersion: string;
  maps: readonly PortfolioRegressionMapRunResult[];
  passed: number;
  regressed: number;
  blocked: number;
  manualRequired: number;
}

const ORDER: readonly RetestPriority[] = [
  "P0",
  "P1",
  "P2",
  "P3",
];

function noRuntimeTargetBatch(
  item: PortfolioRegressionScheduleItem,
): RegressionBatchRunResult {
  return {
    mapId: item.mapId,
    updateVersion: item.queue.updateVersion,
    passed: [],
    regressed: [],
    blocked: item.queue.runtimeReady.map(
      (entry) => ({
        regressionId: entry.regressionId,
        ...(entry.scenarioId === undefined
          ? {}
          : { scenarioId: entry.scenarioId }),
        status: "blocked" as const,
        evidenceIds: [],
        reasons: [
          "No runtime target provider is configured for this map.",
        ],
      }),
    ),
    manualRequired:
      item.queue.manualRequired.map(
        (entry) => ({
          regressionId: entry.regressionId,
          status: "manual-required" as const,
          evidenceIds: [],
          reasons: [...entry.reasons],
        }),
      ),
  };
}

async function runMapItem(
  item: PortfolioRegressionScheduleItem,
  provider: PortfolioRegressionRuntimeProvider,
): Promise<PortfolioRegressionMapRunResult> {
  const target = provider.forMap(item.mapId);

  const batch = target === undefined
    ? noRuntimeTargetBatch(item)
    : await runRegressionExecutionQueue(
        {
          queue: item.queue,
          resolver: target.resolver,
          ...(target.announcedCapabilities === undefined
            ? {}
            : {
                announcedCapabilities:
                  target.announcedCapabilities,
              }),
          context: target.context,
          mutationRisk: target.mutationRisk,
          runtimeProfileMatches:
            target.runtimeProfileMatches,
        },
        target.executor,
      );

  const feedback =
    applyRegressionBatchRetestFeedback(
      item.plan,
      item.queue,
      batch,
    );

  return {
    mapId: item.mapId,
    scheduledPriority: item.priority,
    batch,
    feedback,
  };
}

export async function runPortfolioRegressionSchedule(
  schedule: PortfolioRegressionSchedule,
  provider: PortfolioRegressionRuntimeProvider,
): Promise<PortfolioRegressionBatchRunResult> {
  const maps: PortfolioRegressionMapRunResult[] = [];

  for (const priority of ORDER) {
    for (const item of schedule.groups[priority]) {
      maps.push(
        await runMapItem(item, provider),
      );
    }
  }

  return {
    updateVersion: schedule.updateVersion,
    maps,
    passed: maps.reduce(
      (sum, item) =>
        sum + item.batch.passed.length,
      0,
    ),
    regressed: maps.reduce(
      (sum, item) =>
        sum + item.batch.regressed.length,
      0,
    ),
    blocked: maps.reduce(
      (sum, item) =>
        sum + item.batch.blocked.length,
      0,
    ),
    manualRequired: maps.reduce(
      (sum, item) =>
        sum +
        item.batch.manualRequired.length,
      0,
    ),
  };
}
