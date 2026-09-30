import { describe, expect, it } from "vitest";
import { runScriptMutationCampaign } from "../src/mutation-campaign.js";

describe("Script API mutation detection", () => {
  const source = [
    'import { world } from "@minecraft/server";',
    'world.afterEvents.playerSpawn.subscribe((event) => {',
    '  event.player.setDynamicProperty("joined", true);',
    '});',
  ].join("\n");

  it("kills event drop/rename/duplicate mutations through event graph differences", async () => {
    const result = await runScriptMutationCampaign({
      identifier: "scripts/main",
      relativePath: "behavior_packs/demo/scripts/main.js",
      source,
      knownDynamicPropertyIds: ["joined"],
    });

    const eventResults = result.report.results
      .filter((item) => item.descriptor.domain === "script-event");

    expect(eventResults.length).toBeGreaterThan(0);
    expect(eventResults.every((item) => item.status === "killed")).toBe(true);
  });

  it("kills dynamic property id substitutions against known property ids", async () => {
    const result = await runScriptMutationCampaign({
      identifier: "scripts/main",
      relativePath: "behavior_packs/demo/scripts/main.js",
      source,
      knownDynamicPropertyIds: ["joined"],
    });

    expect(result.report.results).toEqual(expect.arrayContaining([
      expect.objectContaining({
        descriptor: expect.objectContaining({
          operator: "dynamic-property-id-substitution",
        }),
        status: "killed",
      }),
    ]));
  });
});
