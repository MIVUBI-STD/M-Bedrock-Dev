import {
  buildRegressionExecutionQueue,
  type RegressionExecutionBinding,
  type RegressionExecutionQueue,
} from "../regression/regression-execution-queue.js";
import { planRetest } from "../regression/retest-planner.js";
import type {
  BlindspotCoverage,
  MapCompatibilityFingerprint,
  MinecraftUpdateDelta,
  RegressionCase,
  RetestPlan,
  RetestPriority,
} from "../core/types.js";

export interface PortfolioRegressionBinding
  extends RegressionExecutionBinding {
  mapId: string;
}

export interface PortfolioRegressionMapInput {
  fingerprint: MapCompatibilityFingerprint;
  labels?: readonly string[];
}

export interface PortfolioRegressionScheduleItem {
  mapId: string;
  labels: readonly string[];
  priority: RetestPriority;
  plan: RetestPlan;
  queue: RegressionExecutionQueue;
  runtimeReadyCount: number;
  manualRequiredCount: number;
}

export interface PortfolioRegressionSchedule {
  updateVersion: string;
  totalMaps: number;
  totalSelectedRegressions: number;
  totalRuntimeReady: number;
  totalManualRequired: number;
  groups: Record<
    RetestPriority,
    readonly PortfolioRegressionScheduleItem[]
  >;
}

const ORDER: readonly RetestPriority[] = [
  "P0",
  "P1",
  "P2",
  "P3",
];

function planWeight(plan: RetestPlan): number {
  return plan.reasons.reduce(
    (sum, reason) => sum + reason.weight,
    0,
  );
}

function regressionWeight(
  queue: RegressionExecutionQueue,
): number {
  return [
    ...queue.runtimeReady,
    ...queue.manualRequired,
  ].reduce(
    (sum, item) => sum + item.priorityWeight,
    0,
  );
}

export function schedulePortfolioRegressions(
  maps: readonly PortfolioRegressionMapInput[],
  delta: MinecraftUpdateDelta,
  regressions: readonly RegressionCase[] = [],
  coverage: readonly BlindspotCoverage[] = [],
  bindings:
    readonly PortfolioRegressionBinding[] = [],
): PortfolioRegressionSchedule {
  const groups: Record<
    RetestPriority,
    PortfolioRegressionScheduleItem[]
  > = {
    P0: [],
    P1: [],
    P2: [],
    P3: [],
  };

  let totalSelectedRegressions = 0;
  let totalRuntimeReady = 0;
  let totalManualRequired = 0;

  for (const map of maps) {
    const plan = planRetest(
      map.fingerprint,
      delta,
      regressions,
      coverage,
    );

    const mapBindings = bindings
      .filter(
        (binding) =>
          binding.mapId ===
          map.fingerprint.mapId,
      )
      .map(({ regressionId, scenarioId }) => ({
        regressionId,
        scenarioId,
      }));

    const queue =
      buildRegressionExecutionQueue(
        map.fingerprint,
        delta,
        regressions,
        mapBindings,
      );

    const item: PortfolioRegressionScheduleItem = {
      mapId: map.fingerprint.mapId,
      labels: [...(map.labels ?? [])],
      priority: plan.priority,
      plan,
      queue,
      runtimeReadyCount:
        queue.runtimeReady.length,
      manualRequiredCount:
        queue.manualRequired.length,
    };

    groups[plan.priority].push(item);
    totalSelectedRegressions +=
      queue.selectedRegressionIds.length;
    totalRuntimeReady +=
      queue.runtimeReady.length;
    totalManualRequired +=
      queue.manualRequired.length;
  }

  for (const priority of ORDER) {
    groups[priority].sort((a, b) => {
      const aRuntime =
        a.runtimeReadyCount > 0 ? 1 : 0;
      const bRuntime =
        b.runtimeReadyCount > 0 ? 1 : 0;

      return (
        bRuntime - aRuntime ||
        planWeight(b.plan) -
          planWeight(a.plan) ||
        regressionWeight(b.queue) -
          regressionWeight(a.queue) ||
        a.mapId.localeCompare(b.mapId)
      );
    });
  }

  return {
    updateVersion: delta.toVersion,
    totalMaps: maps.length,
    totalSelectedRegressions,
    totalRuntimeReady,
    totalManualRequired,
    groups,
  };
}
