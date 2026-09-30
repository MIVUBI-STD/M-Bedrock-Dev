import { describe, expect, it } from "vitest";
import {
  aggregateBlindspotTasks,
  blindspotTasksFromMutationResults,
  recommendSearchBudget,
  summarizeOperatorEffectiveness,
} from "../src/index.js";

function result(
  operator: string,
  domain: "command-coordinate" | "command-selector",
  status: "killed" | "survived",
) {
  return {
    descriptor: {
      id: `${operator}-${status}`,
      operator,
      domain,
      description: operator,
    },
    status,
  } as const;
}

describe("operator effectiveness and blindspot aggregation", () => {
  it("aggregates repeated survived classes across maps and campaigns", () => {
    const campaigns = [
      {
        campaignId: "c1",
        mapId: "map-a",
        results: [
          result("coordinate-shift", "command-coordinate", "survived"),
          result("selector-broaden", "command-selector", "killed"),
        ],
      },
      {
        campaignId: "c2",
        mapId: "map-b",
        results: [
          result("coordinate-shift", "command-coordinate", "survived"),
        ],
      },
    ];

    const effectiveness = summarizeOperatorEffectiveness(campaigns);
    const blindspots = aggregateBlindspotTasks(
      campaigns.flatMap((campaign) =>
        blindspotTasksFromMutationResults(campaign.results).map((task) => ({
          task,
          campaignId: campaign.campaignId,
          mapId: campaign.mapId,
        })),
      ),
    );
    const budget = recommendSearchBudget(effectiveness, blindspots);

    expect(effectiveness.operators[0]).toMatchObject({
      operator: "coordinate-shift",
      survived: 2,
      survivalRate: 1,
      mapsSeen: 2,
    });
    expect(blindspots.items[0]).toMatchObject({
      key: "command-coordinate:coordinate-shift",
      occurrences: 2,
      maps: ["map-a", "map-b"],
    });
    expect(budget.recommendations[0]).toMatchObject({
      operator: "coordinate-shift",
      action: "increase",
    });
  });

  it("can reduce redundant operator pressure after strong kill history", () => {
    const results = Array.from({ length: 12 }, (_, index) => ({
      descriptor: {
        id: `selector-${index}`,
        operator: "selector-broaden",
        domain: "command-selector" as const,
        description: "selector",
      },
      status: "killed" as const,
    }));

    const effectiveness = summarizeOperatorEffectiveness([{
      campaignId: "c",
      results,
    }]);
    const blindspots = aggregateBlindspotTasks([]);
    const budget = recommendSearchBudget(effectiveness, blindspots);

    expect(budget.recommendations[0]).toMatchObject({
      operator: "selector-broaden",
      action: "decrease",
    });
  });
});
