import {
  aggregateBlindspotTasks,
  type BlindspotAggregateReport,
} from "./blindspot-aggregate.js";
import {
  summarizeOperatorEffectiveness,
  type MutationCampaignSample,
  type OperatorEffectivenessReport,
} from "./operator-effectiveness.js";
import {
  recommendSearchBudget,
  type SearchBudgetPlan,
} from "./search-budget.js";
import type { CampaignHistoryRecord } from "./campaign-history.js";

export interface HistoricalReliabilityAnalysis {
  records: number;
  effectiveness: OperatorEffectivenessReport;
  blindspots: BlindspotAggregateReport;
  budget: SearchBudgetPlan;
}

export function analyzeCampaignHistory(
  records: readonly CampaignHistoryRecord[],
): HistoricalReliabilityAnalysis {
  const mutationRecords = records.filter((record) => record.mutationReport);

  const samples: MutationCampaignSample[] = mutationRecords.map((record) => ({
    campaignId: record.campaignId,
    ...(record.mapId ? { mapId: record.mapId } : {}),
    results: record.mutationReport!.results,
  }));

  const effectiveness = summarizeOperatorEffectiveness(samples);

  const blindspots = aggregateBlindspotTasks(
    records.flatMap((record) =>
      record.blindspotTasks.map((task) => ({
        task,
        campaignId: record.campaignId,
        ...(record.mapId ? { mapId: record.mapId } : {}),
      })),
    ),
  );

  return {
    records: records.length,
    effectiveness,
    blindspots,
    budget: recommendSearchBudget(effectiveness, blindspots),
  };
}
