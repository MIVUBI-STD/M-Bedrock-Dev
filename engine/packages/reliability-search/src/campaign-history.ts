import { createHash } from "node:crypto";
import type {
  BlindspotTask,
} from "./blindspot-tasks.js";
import type {
  MutationScoreReport,
} from "./mutation-types.js";

export interface CampaignHistoryRecord {
  schemaVersion: 1;
  campaignId: string;
  createdAt: string;
  mapId?: string;
  minecraftVersion?: string;
  artifactFingerprint?: string;
  reliabilityFingerprintId?: string;
  mutationReport?: MutationScoreReport;
  blindspotTasks: readonly BlindspotTask[];
  notes?: readonly string[];
}

export function campaignHistoryIdentity(
  record: CampaignHistoryRecord,
): string {
  return "campaign_" + createHash("sha256")
    .update(JSON.stringify({
      campaignId: record.campaignId,
      createdAt: record.createdAt,
      mapId: record.mapId ?? null,
      minecraftVersion: record.minecraftVersion ?? null,
      artifactFingerprint: record.artifactFingerprint ?? null,
      reliabilityFingerprintId: record.reliabilityFingerprintId ?? null,
      mutationReport: record.mutationReport ?? null,
      blindspotTasks: record.blindspotTasks,
      notes: record.notes ?? [],
    }))
    .digest("hex")
    .slice(0, 20);
}

export function validateCampaignHistoryRecord(
  record: CampaignHistoryRecord,
): string[] {
  const errors: string[] = [];
  if (record.schemaVersion !== 1) errors.push("Campaign history schemaVersion must be 1.");
  if (!record.campaignId.trim()) errors.push("Campaign history requires campaignId.");
  if (!record.createdAt.trim()) errors.push("Campaign history requires createdAt.");
  if (Number.isNaN(Date.parse(record.createdAt))) {
    errors.push("Campaign history createdAt must be an ISO-compatible date.");
  }
  return errors;
}
