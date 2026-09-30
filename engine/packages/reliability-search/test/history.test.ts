import { describe, expect, it } from "vitest";
import {
  AppendOnlyCampaignHistory,
  campaignHistoryIdentity,
} from "../src/index.js";

describe("append-only campaign history", () => {
  it("retains unique evidence records and rejects duplicates", () => {
    const history = new AppendOnlyCampaignHistory();
    const record = {
      schemaVersion: 1 as const,
      campaignId: "campaign-a",
      createdAt: "2026-09-23T00:00:00Z",
      blindspotTasks: [],
    };

    expect(history.append(record).accepted).toBe(true);
    const duplicate = history.append(record);
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.id).toBe(campaignHistoryIdentity(record));
    expect(history.all()).toHaveLength(1);
  });
});
