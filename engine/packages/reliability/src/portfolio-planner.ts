import { planRetest } from "./retest-planner.js";
import type {
  BlindspotCoverage,
  MapCompatibilityFingerprint,
  MinecraftUpdateDelta,
  RegressionCase,
  RetestPlan,
  RetestPriority,
} from "./types.js";

export interface PortfolioMapEntry {
  fingerprint: MapCompatibilityFingerprint;
  labels?: readonly string[];
}

export interface PortfolioRetestItem {
  mapId: string;
  priority: RetestPriority;
  labels: readonly string[];
  plan: RetestPlan;
}

export interface PortfolioRetestSummary {
  updateVersion: string;
  totalMaps: number;
  groups: Record<RetestPriority, PortfolioRetestItem[]>;
  affectedMaps: number;
  unaffectedMaps: number;
}

const ORDER: readonly RetestPriority[] = ["P0", "P1", "P2", "P3"];

function hasActionableReason(plan: RetestPlan): boolean {
  return plan.reasons.some((reason) =>
    reason.kind === "update-overlap" ||
    reason.kind === "historical-regression" ||
    reason.kind === "runtime-sensitive" ||
    reason.kind === "coverage-gap"
  );
}

export function planPortfolioRetest(
  maps: readonly PortfolioMapEntry[],
  delta: MinecraftUpdateDelta,
  regressions: readonly RegressionCase[] = [],
  coverage: readonly BlindspotCoverage[] = [],
): PortfolioRetestSummary {
  const groups: Record<RetestPriority, PortfolioRetestItem[]> = {
    P0: [],
    P1: [],
    P2: [],
    P3: [],
  };

  let affectedMaps = 0;

  for (const entry of maps) {
    const plan = planRetest(
      entry.fingerprint,
      delta,
      regressions,
      coverage,
    );

    const item: PortfolioRetestItem = {
      mapId: entry.fingerprint.mapId,
      priority: plan.priority,
      labels: [...(entry.labels ?? [])],
      plan,
    };

    groups[plan.priority].push(item);
    if (hasActionableReason(plan)) affectedMaps += 1;
  }

  for (const priority of ORDER) {
    groups[priority].sort((a, b) =>
      b.plan.reasons.reduce((sum, reason) => sum + reason.weight, 0) -
      a.plan.reasons.reduce((sum, reason) => sum + reason.weight, 0) ||
      a.mapId.localeCompare(b.mapId),
    );
  }

  return {
    updateVersion: delta.toVersion,
    totalMaps: maps.length,
    groups,
    affectedMaps,
    unaffectedMaps: maps.length - affectedMaps,
  };
}
