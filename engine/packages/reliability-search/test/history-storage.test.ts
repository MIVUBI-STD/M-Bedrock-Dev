import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadCampaignHistoryDirectory,
  persistCampaignHistoryRecord,
} from "../src/index.js";

describe("persistent append-only campaign history", () => {
  it("persists once and treats identical evidence as immutable duplicate", async () => {
    const directory = await mkdtemp(join(tmpdir(), "m-bedrock-history-"));
    const record = {
      schemaVersion: 1 as const,
      campaignId: "c1",
      createdAt: "2026-09-23T00:00:00Z",
      mapId: "map-a",
      blindspotTasks: [],
    };

    const first = await persistCampaignHistoryRecord(directory, record);
    const second = await persistCampaignHistoryRecord(directory, record);

    expect(first.written).toBe(true);
    expect(second.written).toBe(false);

    const loaded = await loadCampaignHistoryDirectory(directory);
    expect(loaded).toEqual([record]);
  });
});
