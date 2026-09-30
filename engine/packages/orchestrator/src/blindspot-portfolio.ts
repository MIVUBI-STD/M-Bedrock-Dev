import {
  aggregateBlindspotTasks,
  blindspotTasksFromMutationResults,
  createReliabilitySearchHistorySnapshot,
  recommendSearchBudget,
  summarizeOperatorEffectiveness,
  type MutationCampaignSample,
  type MutationTestResult,
} from "../../reliability-search/src/index.js";

export interface CampaignBlindspotInput {
  campaignId: string;
  mapId?: string;
  results: readonly MutationTestResult[];
}

export function buildBlindspotPortfolio(
  campaigns: readonly CampaignBlindspotInput[],
  createdAt?: string,
) {
  const samples: MutationCampaignSample[] = campaigns.map((campaign) => ({
    campaignId: campaign.campaignId,
    ...(campaign.mapId ? { mapId: campaign.mapId } : {}),
    results: campaign.results,
  }));

  const effectiveness = summarizeOperatorEffectiveness(samples);

  const blindspots = aggregateBlindspotTasks(
    campaigns.flatMap((campaign) =>
      blindspotTasksFromMutationResults(campaign.results).map((task) => ({
        task,
        campaignId: campaign.campaignId,
        ...(campaign.mapId ? { mapId: campaign.mapId } : {}),
      })),
    ),
  );

  const budget = recommendSearchBudget(effectiveness, blindspots);

  return createReliabilitySearchHistorySnapshot(
    effectiveness,
    blindspots,
    budget,
    createdAt,
  );
}
