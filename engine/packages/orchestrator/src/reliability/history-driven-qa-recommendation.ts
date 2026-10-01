import type {
  PortfolioRegressionSchedule,
  PortfolioRegressionScheduleItem,
  RetestPriority,
} from "../../../reliability/src/index.js";
import type {
  PortfolioReleaseIntelligence,
  PortfolioReleaseMapTrend,
  PortfolioReleaseRegressionTrend,
} from "./portfolio-release-intelligence.js";

export type HistoryDrivenQaDisposition =
  | "test-first"
  | "standard"
  | "manual-followup";

export interface HistoryDrivenQaRecommendation {
  mapId: string;
  disposition: HistoryDrivenQaDisposition;
  scheduledPriority: RetestPriority;
  runtimeReadyCount: number;
  manualRequiredCount: number;
  currentBlockerCount: number;
  recurringRegressionCount: number;
  worsenedTransitions: number;
  reasons: readonly string[];
}

export interface HistoryDrivenQaPlan {
  updateVersion: string;
  recommendations:
    readonly HistoryDrivenQaRecommendation[];
}

const PRIORITY_ORDER: Readonly<Record<
  RetestPriority,
  number
>> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function scheduleItems(
  schedule: PortfolioRegressionSchedule,
): PortfolioRegressionScheduleItem[] {
  return [
    ...schedule.groups.P0,
    ...schedule.groups.P1,
    ...schedule.groups.P2,
    ...schedule.groups.P3,
  ];
}

function regressionsForMap(
  items: readonly PortfolioReleaseRegressionTrend[],
  mapId: string,
): PortfolioReleaseRegressionTrend[] {
  return items.filter(
    (item) => item.mapId === mapId,
  );
}

function trendForMap(
  intelligence: PortfolioReleaseIntelligence,
  mapId: string,
): PortfolioReleaseMapTrend | undefined {
  return intelligence.maps.find(
    (item) => item.mapId === mapId,
  );
}

function dispositionFor(input: {
  blockerCount: number;
  recurringCount: number;
  worsenedTransitions: number;
  scheduledPriority: RetestPriority;
  runtimeReadyCount: number;
  manualRequiredCount: number;
}): HistoryDrivenQaDisposition {
  if (
    input.blockerCount > 0 ||
    input.recurringCount > 0 ||
    input.worsenedTransitions > 0 ||
    input.scheduledPriority === "P0"
  ) {
    return "test-first";
  }

  if (
    input.runtimeReadyCount === 0 &&
    input.manualRequiredCount > 0
  ) {
    return "manual-followup";
  }

  return "standard";
}

export function recommendHistoryDrivenQa(
  schedule: PortfolioRegressionSchedule,
  intelligence: PortfolioReleaseIntelligence,
): HistoryDrivenQaPlan {
  const recommendations =
    scheduleItems(schedule).map((item) => {
      const trend = trendForMap(
        intelligence,
        item.mapId,
      );
      const currentBlockers =
        regressionsForMap(
          intelligence.currentBlockers,
          item.mapId,
        );
      const recurring =
        regressionsForMap(
          intelligence.recurringRegressions,
          item.mapId,
        );
      const worsenedTransitions =
        trend?.worsenedTransitions ?? 0;

      const reasons: string[] = [];

      if (currentBlockers.length > 0) {
        reasons.push(
          "Current release blocker(s): " +
            currentBlockers
              .map((entry) =>
                entry.regressionId
              )
              .sort()
              .join(", ") +
            ".",
        );
      }

      if (recurring.length > 0) {
        reasons.push(
          "Recurring regression history: " +
            recurring
              .map((entry) =>
                entry.regressionId +
                " (" +
                entry.occurrences +
                " releases)"
              )
              .sort()
              .join(", ") +
            ".",
        );
      }

      if (worsenedTransitions > 0) {
        reasons.push(
          "Map status worsened between releases " +
            worsenedTransitions +
            " time(s).",
        );
      }

      reasons.push(
        "Current retest priority: " +
          item.priority +
          ".",
      );

      if (item.runtimeReadyCount > 0) {
        reasons.push(
          item.runtimeReadyCount +
            " selected historical regression(s) are runtime-ready.",
        );
      }

      if (item.manualRequiredCount > 0) {
        reasons.push(
          item.manualRequiredCount +
            " selected historical regression(s) still require manual QA.",
        );
      }

      return {
        mapId: item.mapId,
        disposition: dispositionFor({
          blockerCount:
            currentBlockers.length,
          recurringCount:
            recurring.length,
          worsenedTransitions,
          scheduledPriority:
            item.priority,
          runtimeReadyCount:
            item.runtimeReadyCount,
          manualRequiredCount:
            item.manualRequiredCount,
        }),
        scheduledPriority: item.priority,
        runtimeReadyCount:
          item.runtimeReadyCount,
        manualRequiredCount:
          item.manualRequiredCount,
        currentBlockerCount:
          currentBlockers.length,
        recurringRegressionCount:
          recurring.length,
        worsenedTransitions,
        reasons,
      } satisfies HistoryDrivenQaRecommendation;
    });

  recommendations.sort((a, b) =>
    b.currentBlockerCount -
      a.currentBlockerCount ||
    b.recurringRegressionCount -
      a.recurringRegressionCount ||
    b.worsenedTransitions -
      a.worsenedTransitions ||
    PRIORITY_ORDER[a.scheduledPriority] -
      PRIORITY_ORDER[b.scheduledPriority] ||
    b.runtimeReadyCount -
      a.runtimeReadyCount ||
    a.mapId.localeCompare(b.mapId)
  );

  return {
    updateVersion: schedule.updateVersion,
    recommendations,
  };
}

export function historyDrivenQaPlanText(
  plan: HistoryDrivenQaPlan,
): string {
  const lines = [
    "History-Driven QA Plan",
    "Update: " + plan.updateVersion,
  ];

  for (const item of plan.recommendations) {
    lines.push(
      "",
      item.mapId +
        " [" +
        item.disposition +
        "] " +
        item.scheduledPriority,
      ...item.reasons.map(
        (reason) => "- " + reason,
      ),
    );
  }

  return lines.join("\n") + "\n";
}
