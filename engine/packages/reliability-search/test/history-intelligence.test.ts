import { describe, expect, it } from "vitest";
import {
  analyzeCampaignHistory,
  createTargetedSearchTasks,
} from "../src/index.js";

describe("history-driven targeted search", () => {
  it("aggregates historical survived mutants and emits prioritized search tasks", () => {
    const records = [
      {
        schemaVersion: 1 as const,
        campaignId: "c1",
        createdAt: "2026-09-23T00:00:00Z",
        mapId: "map-a",
        mutationReport: {
          total: 1,
          killed: 0,
          survived: 1,
          invalid: 0,
          score: 0,
          byDomain: {},
          results: [{
            descriptor: {
              id: "coord-a",
              operator: "coordinate-shift",
              domain: "command-coordinate" as const,
              description: "shift",
            },
            status: "survived" as const,
          }],
        },
        blindspotTasks: [{
          id: "blindspot:coord-a",
          operator: "coordinate-shift",
          domain: "command-coordinate" as const,
          reason: "no oracle",
          suggestedStrategies: ["topology" as const, "differential" as const],
          priority: "P1" as const,
        }],
      },
      {
        schemaVersion: 1 as const,
        campaignId: "c2",
        createdAt: "2026-09-23T01:00:00Z",
        mapId: "map-b",
        mutationReport: {
          total: 1,
          killed: 0,
          survived: 1,
          invalid: 0,
          score: 0,
          byDomain: {},
          results: [{
            descriptor: {
              id: "coord-b",
              operator: "coordinate-shift",
              domain: "command-coordinate" as const,
              description: "shift",
            },
            status: "survived" as const,
          }],
        },
        blindspotTasks: [{
          id: "blindspot:coord-b",
          operator: "coordinate-shift",
          domain: "command-coordinate" as const,
          reason: "no oracle",
          suggestedStrategies: ["topology" as const, "runtime-observation" as const],
          priority: "P1" as const,
        }],
      },
    ];

    const analysis = analyzeCampaignHistory(records);
    const tasks = createTargetedSearchTasks(
      analysis.blindspots,
      analysis.budget,
    );

    expect(analysis.records).toBe(2);
    expect(analysis.blindspots.items[0]).toMatchObject({
      occurrences: 2,
      maps: ["map-a", "map-b"],
    });
    expect(tasks[0]).toMatchObject({
      priority: "P1",
      operator: "coordinate-shift",
      evidenceCount: 2,
    });
  });
});
