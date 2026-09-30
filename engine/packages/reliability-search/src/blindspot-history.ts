import type { BlindspotAggregateReport } from "./blindspot-aggregate.js";
import type { OperatorEffectivenessReport } from "./operator-effectiveness.js";
import type { SearchBudgetPlan } from "./search-budget.js";

export interface ReliabilitySearchHistorySnapshot {
  schemaVersion: 1;
  createdAt?: string;
  campaigns: number;
  effectiveness: OperatorEffectivenessReport;
  blindspots: BlindspotAggregateReport;
  budget: SearchBudgetPlan;
}

export function createReliabilitySearchHistorySnapshot(
  effectiveness: OperatorEffectivenessReport,
  blindspots: BlindspotAggregateReport,
  budget: SearchBudgetPlan,
  createdAt?: string,
): ReliabilitySearchHistorySnapshot {
  return {
    schemaVersion: 1,
    ...(createdAt ? { createdAt } : {}),
    campaigns: effectiveness.campaigns,
    effectiveness,
    blindspots,
    budget,
  };
}
