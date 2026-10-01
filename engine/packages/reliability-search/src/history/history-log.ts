import type { CampaignHistoryRecord } from "./campaign-history.js";
import {
  campaignHistoryIdentity,
  validateCampaignHistoryRecord,
} from "./campaign-history.js";

export interface AppendHistoryResult {
  accepted: boolean;
  id: string;
  reason?: string;
}

export class AppendOnlyCampaignHistory {
  private readonly records: CampaignHistoryRecord[] = [];
  private readonly ids = new Set<string>();

  append(record: CampaignHistoryRecord): AppendHistoryResult {
    const errors = validateCampaignHistoryRecord(record);
    if (errors.length > 0) {
      return {
        accepted: false,
        id: "",
        reason: errors.join("; "),
      };
    }

    const id = campaignHistoryIdentity(record);
    if (this.ids.has(id)) {
      return {
        accepted: false,
        id,
        reason: "Duplicate campaign evidence record.",
      };
    }

    this.records.push(record);
    this.ids.add(id);
    return { accepted: true, id };
  }

  all(): readonly CampaignHistoryRecord[] {
    return [...this.records];
  }
}
