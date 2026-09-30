import type {
  PortfolioRegressionSchedule,
  RegressionExecutionQueueItem,
} from "../../reliability/src/index.js";
import type {
  HistoryDrivenQaPlan,
  HistoryDrivenQaRecommendation,
} from "./history-driven-qa-recommendation.js";

export interface QaExecutionBudget {
  maxRuntimeCases: number;
}

export interface BudgetedRuntimeCase {
  order: number;
  mapId: string;
  regressionId: string;
  scenarioId: string;
  recommendationDisposition:
    HistoryDrivenQaRecommendation["disposition"];
  scheduledPriority:
    HistoryDrivenQaRecommendation["scheduledPriority"];
  reasons: readonly string[];
}

export interface DeferredRuntimeCase {
  mapId: string;
  regressionId: string;
  scenarioId: string;
  recommendationDisposition:
    HistoryDrivenQaRecommendation["disposition"];
  scheduledPriority:
    HistoryDrivenQaRecommendation["scheduledPriority"];
  reason: "budget-exhausted";
}

export interface QaExecutionBudgetPlan {
  updateVersion: string;
  maxRuntimeCases: number;
  availableRuntimeCases: number;
  selected: readonly BudgetedRuntimeCase[];
  deferred: readonly DeferredRuntimeCase[];
  manualRequired: readonly {
    mapId: string;
    regressionId: string;
  }[];
}

function scheduleMapQueues(
  schedule: PortfolioRegressionSchedule,
): ReadonlyMap<
  string,
  {
    runtimeReady: readonly RegressionExecutionQueueItem[];
    manualRequired: readonly RegressionExecutionQueueItem[];
  }
> {
  const entries = [
    ...schedule.groups.P0,
    ...schedule.groups.P1,
    ...schedule.groups.P2,
    ...schedule.groups.P3,
  ];

  return new Map(
    entries.map((item) => [
      item.mapId,
      {
        runtimeReady: item.queue.runtimeReady,
        manualRequired: item.queue.manualRequired,
      },
    ]),
  );
}

function validateBudget(
  budget: QaExecutionBudget,
): void {
  if (
    !Number.isInteger(budget.maxRuntimeCases) ||
    budget.maxRuntimeCases < 0
  ) {
    throw new Error(
      "QA execution budget maxRuntimeCases must be a non-negative integer.",
    );
  }
}

export function planQaExecutionBudget(
  schedule: PortfolioRegressionSchedule,
  recommendations: HistoryDrivenQaPlan,
  budget: QaExecutionBudget,
): QaExecutionBudgetPlan {
  validateBudget(budget);

  if (
    schedule.updateVersion !==
      recommendations.updateVersion
  ) {
    throw new Error(
      "QA execution budget schedule/recommendation updateVersion mismatch.",
    );
  }

  const queues = scheduleMapQueues(schedule);
  const candidates: Omit<
    BudgetedRuntimeCase,
    "order"
  >[] = [];
  const manualRequired: {
    mapId: string;
    regressionId: string;
  }[] = [];

  for (const recommendation of recommendations.recommendations) {
    const queue = queues.get(
      recommendation.mapId,
    );

    if (!queue) {
      throw new Error(
        "QA recommendation references map missing from regression schedule: " +
          recommendation.mapId +
          ".",
      );
    }

    for (const item of queue.runtimeReady) {
      if (!item.scenarioId) {
        throw new Error(
          "Runtime-ready regression is missing scenarioId: " +
            item.regressionId +
            ".",
        );
      }

      candidates.push({
        mapId: recommendation.mapId,
        regressionId: item.regressionId,
        scenarioId: item.scenarioId,
        recommendationDisposition:
          recommendation.disposition,
        scheduledPriority:
          recommendation.scheduledPriority,
        reasons: [
          ...recommendation.reasons,
          ...item.reasons,
        ],
      });
    }

    for (const item of queue.manualRequired) {
      manualRequired.push({
        mapId: recommendation.mapId,
        regressionId: item.regressionId,
      });
    }
  }

  const selected = candidates
    .slice(0, budget.maxRuntimeCases)
    .map((item, index) => ({
      ...item,
      order: index + 1,
    }));

  const deferred = candidates
    .slice(budget.maxRuntimeCases)
    .map((item) => ({
      mapId: item.mapId,
      regressionId: item.regressionId,
      scenarioId: item.scenarioId,
      recommendationDisposition:
        item.recommendationDisposition,
      scheduledPriority:
        item.scheduledPriority,
      reason: "budget-exhausted" as const,
    }));

  return {
    updateVersion: schedule.updateVersion,
    maxRuntimeCases: budget.maxRuntimeCases,
    availableRuntimeCases:
      candidates.length,
    selected,
    deferred,
    manualRequired: manualRequired
      .sort((a, b) =>
        a.mapId.localeCompare(b.mapId) ||
        a.regressionId.localeCompare(
          b.regressionId,
        )
      ),
  };
}

export function qaExecutionBudgetPlanText(
  plan: QaExecutionBudgetPlan,
): string {
  const lines = [
    "QA Execution Budget Plan",
    "Update: " + plan.updateVersion,
    "Runtime budget: " +
      plan.maxRuntimeCases,
    "Runtime cases available: " +
      plan.availableRuntimeCases,
    "",
    "Selected",
  ];

  if (plan.selected.length === 0) {
    lines.push("- none");
  } else {
    for (const item of plan.selected) {
      lines.push(
        "- " +
          item.order +
          ". " +
          item.mapId +
          " / " +
          item.regressionId +
          " [" +
          item.recommendationDisposition +
          " " +
          item.scheduledPriority +
          "]",
      );
    }
  }

  lines.push("", "Deferred by budget");

  if (plan.deferred.length === 0) {
    lines.push("- none");
  } else {
    for (const item of plan.deferred) {
      lines.push(
        "- " +
          item.mapId +
          " / " +
          item.regressionId +
          " (" +
          item.reason +
          ")",
      );
    }
  }

  lines.push("", "Manual required");

  if (plan.manualRequired.length === 0) {
    lines.push("- none");
  } else {
    for (const item of plan.manualRequired) {
      lines.push(
        "- " +
          item.mapId +
          " / " +
          item.regressionId,
      );
    }
  }

  return lines.join("\n") + "\n";
}
