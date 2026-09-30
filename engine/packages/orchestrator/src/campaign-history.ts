import {
  blindspotTasksFromMutationResults,
  type CampaignHistoryRecord,
  type MutationScoreReport,
} from "../../reliability-search/src/index.js";

export interface CreateCampaignHistoryInput {
  campaignId: string;
  createdAt: string;
  mapId?: string;
  minecraftVersion?: string;
  artifactFingerprint?: string;
  reliabilityFingerprintId?: string;
  mutationReport?: MutationScoreReport;
  notes?: readonly string[];
}

export function createCampaignHistoryRecord(
  input: CreateCampaignHistoryInput,
): CampaignHistoryRecord {
  const blindspotTasks = input.mutationReport
    ? blindspotTasksFromMutationResults(input.mutationReport.results)
    : [];

  return {
    schemaVersion: 1,
    campaignId: input.campaignId,
    createdAt: input.createdAt,
    ...(input.mapId ? { mapId: input.mapId } : {}),
    ...(input.minecraftVersion ? { minecraftVersion: input.minecraftVersion } : {}),
    ...(input.artifactFingerprint
      ? { artifactFingerprint: input.artifactFingerprint }
      : {}),
    ...(input.reliabilityFingerprintId
      ? { reliabilityFingerprintId: input.reliabilityFingerprintId }
      : {}),
    ...(input.mutationReport ? { mutationReport: input.mutationReport } : {}),
    blindspotTasks,
    ...(input.notes ? { notes: input.notes } : {}),
  };
}
