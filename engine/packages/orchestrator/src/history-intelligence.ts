import {
  analyzeCampaignHistory,
  createTargetedSearchTasks,
  loadCampaignHistoryDirectory,
} from "../../reliability-search/src/index.js";

export async function buildHistoricalSearchIntelligence(
  historyDirectory: string,
) {
  const records = await loadCampaignHistoryDirectory(historyDirectory);
  const analysis = analyzeCampaignHistory(records);
  const targetedTasks = createTargetedSearchTasks(
    analysis.blindspots,
    analysis.budget,
  );

  return {
    records,
    analysis,
    targetedTasks,
  };
}
