import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../analyzers/scripts/src/parse.js";
import {
  aggregateScriptApiUsage,
  deriveScriptApiUsage,
} from "../src/script-api-usage.js";

function parse(relativePath: string, text: string) {
  return parseScriptFile(
    relativePath.replace(/\.[^.]+$/, ""),
    text,
    { artifactId: "fixture", relativePath },
  );
}

describe("Script API usage inventory", () => {
  it("separates evidence-backed symbols from real unclassified usage", () => {
    const usage = deriveScriptApiUsage([
      parse("behavior_packs/demo/scripts/main.js", `
        import { world } from "@minecraft/server";
        world.afterEvents.playerSpawn.subscribe(() => {});
        const dimension = world.getDimension("overworld");
        for (const entity of dimension.getEntities()) {
          entity.getTags();
        }
        world.scoreboard.getObjective("round");
      `),
    ]);

    expect(usage.totalOccurrences).toBe(5);
    expect(usage.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "world.getDimension",
        knowledge: "known",
      }),
      expect.objectContaining({
        symbol: "Dimension.getEntities",
        knowledge: "known",
        boundedOccurrences: 1,
      }),
      expect.objectContaining({
        symbol: "Entity.getTags",
        knowledge: "known",
      }),
      expect.objectContaining({
        symbol: "Scoreboard.getObjective",
        knowledge: "unclassified",
      }),
      expect.objectContaining({
        symbol: "world.afterEvents.playerSpawn",
        knowledge: "unclassified",
      }),
    ]));
  });

  it("retains lifecycle metadata for observed legacy symbols", () => {
    const usage = deriveScriptApiUsage([
      parse("legacy/scripts/main.js", `
        import { world } from "@minecraft/server";
        world.playSound("note.pling", { x: 0, y: 0, z: 0 });
        world.beforeEvents.worldInitialize.subscribe(() => {});
      `),
    ]);

    expect(usage.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "world.playSound",
        lifecycle: expect.objectContaining({
          deprecatedInMajor: 1,
          removedIn: "2.0.0",
        }),
      }),
      expect.objectContaining({
        symbol: "world.beforeEvents.worldInitialize",
        lifecycle: expect.objectContaining({
          removedIn: "2.0.0",
        }),
      }),
    ]));
  });

  it("ranks portfolio promotion candidates by real map coverage before raw frequency", () => {
    const mapA = deriveScriptApiUsage([
      parse("a/scripts/main.js", `
        import { world } from "@minecraft/server";
        world.scoreboard.getObjective("round");
        world.scoreboard.getObjective("score");
        world.afterEvents.playerSpawn.subscribe(() => {});
      `),
    ]);
    const mapB = deriveScriptApiUsage([
      parse("b/scripts/main.js", `
        import { world } from "@minecraft/server";
        world.scoreboard.getObjective("round");
        world.getDimension("overworld");
      `),
    ]);

    const portfolio = aggregateScriptApiUsage([
      { mapId: "map-a", usage: mapA },
      { mapId: "map-b", usage: mapB },
    ]);

    expect(portfolio.promotionCandidates[0]).toMatchObject({
      symbol: "Scoreboard.getObjective",
      mapCount: 2,
      occurrences: 3,
      knowledge: "unclassified",
    });
    expect(portfolio.symbols.find(
      (item) => item.symbol === "world.getDimension",
    )).toMatchObject({
      knowledge: "known",
      mapCount: 1,
    });
  });
});
