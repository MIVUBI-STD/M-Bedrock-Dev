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

    expect(usage.totalOccurrences).toBe(6);
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
        knowledge: "known",
      }),
      expect.objectContaining({
        symbol: "world.afterEvents.playerSpawn",
        knowledge: "known",
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

  it("inventories property and enum lifecycle symbols without losing replacements", () => {
    const usage = deriveScriptApiUsage([
      parse("legacy/scripts/main.js", `
        import { world, GameMode as GM } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.inputPermissions.cameraEnabled;
        const oldMode = GM.adventure;
        const newMode = GM.Adventure;
      `),
    ]);

    expect(usage.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "property",
        symbol: "PlayerInputPermissions.cameraEnabled",
        knowledge: "known",
        lifecycle: expect.objectContaining({ removedIn: "2.0.0" }),
      }),
      expect.objectContaining({
        kind: "enum",
        symbol: "GameMode.adventure",
        knowledge: "known",
        lifecycle: expect.objectContaining({
          removedIn: "2.0.0",
          replacement: "GameMode.Adventure",
        }),
      }),
      expect.objectContaining({
        kind: "enum",
        symbol: "GameMode.Adventure",
        knowledge: "known",
      }),
    ]));
  });

  it("merges inherited Player properties into Entity usage symbols", () => {
    const usage = deriveScriptApiUsage([
      parse("bundle/scripts/main.js", `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.id;
        player.location;
        player.scoreboardIdentity;
      `),
    ]);

    expect(usage.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ symbol: "Entity.id", receiverTypes: ["Player"] }),
      expect.objectContaining({ symbol: "Entity.location", receiverTypes: ["Player"] }),
      expect.objectContaining({ symbol: "Entity.scoreboardIdentity", receiverTypes: ["Player"] }),
    ]));
    expect(usage.symbols.some((item) => item.symbol === "Player.id")).toBe(false);
  });

  it("retains method call-shape distributions and signature knowledge", () => {
    const usage = deriveScriptApiUsage([
      parse("signature/scripts/main.js", `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.applyKnockback(0, 1, 0.5, 0.4);
        player.applyKnockback({ x: 0, z: 1 }, 0.4);
      `),
    ]);

    expect(usage.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "method",
        symbol: "Entity.applyKnockback",
        knowledge: "known",
        callShapes: expect.arrayContaining([
          expect.objectContaining({
            argumentCount: 4,
            argumentKinds: ["number", "number", "number", "number"],
            occurrences: 1,
          }),
          expect.objectContaining({
            argumentCount: 2,
            argumentKinds: ["object", "number"],
            occurrences: 1,
          }),
        ]),
      }),
    ]));
  });

  it("merges call-shape distributions across maps", () => {
    const legacy = deriveScriptApiUsage([
      parse("legacy/scripts/main.js", `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.applyKnockback(0, 1, 0.5, 0.4);
      `),
    ]);
    const current = deriveScriptApiUsage([
      parse("current/scripts/main.js", `
        import { world } from "@minecraft/server";
        const player = world.getAllPlayers()[0];
        player.applyKnockback({ x: 0, z: 1 }, 0.4);
      `),
    ]);

    const portfolio = aggregateScriptApiUsage([
      { mapId: "legacy-map", usage: legacy },
      { mapId: "current-map", usage: current },
    ]);

    expect(portfolio.symbols.find(
      (item) => item.symbol === "Entity.applyKnockback",
    )).toMatchObject({
      mapCount: 2,
      callShapes: expect.arrayContaining([
        expect.objectContaining({ argumentCount: 4, occurrences: 1 }),
        expect.objectContaining({ argumentCount: 2, occurrences: 1 }),
      ]),
    });
  });

  it("retains method result-use distributions for return-contract analysis", () => {
    const usage = deriveScriptApiUsage([
      parse("return/scripts/main.js", `
        import { world } from "@minecraft/server";
        const entity = world.getDimension("overworld").getEntities()[0];
        entity.getComponent("minecraft:health").currentValue;
        entity.getComponent("minecraft:health")?.currentValue;
      `),
    ]);

    expect(usage.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({
        symbol: "Entity.getComponent",
        knowledge: "known",
        resultUses: expect.arrayContaining([
          expect.objectContaining({ use: "dereferenced", occurrences: 1 }),
          expect.objectContaining({ use: "optional-dereferenced", occurrences: 1 }),
        ]),
      }),
    ]));
  });

  it("retains enum backing-value comparison distributions", () => {
    const oldUsage = deriveScriptApiUsage([
      parse("old/scripts/main.js", `
        import { BlockComponentTypes } from "@minecraft/server";
        BlockComponentTypes.FluidContainer === "minecraft:fluidContainer";
      `),
    ]);
    const newUsage = deriveScriptApiUsage([
      parse("new/scripts/main.js", `
        import { BlockComponentTypes } from "@minecraft/server";
        BlockComponentTypes.FluidContainer === "minecraft:fluid_container";
      `),
    ]);

    const oldSymbol = oldUsage.symbols.find(
      (item) => item.symbol === "BlockComponentTypes.FluidContainer",
    );
    expect(oldSymbol).toMatchObject({
      kind: "enum",
      knowledge: "known",
      literalComparisons: [
        expect.objectContaining({
          literal: "minecraft:fluidContainer",
          operator: "===",
          occurrences: 1,
        }),
      ],
    });

    const portfolio = aggregateScriptApiUsage([
      { mapId: "old-map", usage: oldUsage },
      { mapId: "new-map", usage: newUsage },
    ]);
    expect(portfolio.symbols.find(
      (item) => item.symbol === "BlockComponentTypes.FluidContainer",
    )).toMatchObject({
      mapCount: 2,
      literalComparisons: expect.arrayContaining([
        expect.objectContaining({
          literal: "minecraft:fluidContainer",
          occurrences: 1,
        }),
        expect.objectContaining({
          literal: "minecraft:fluid_container",
          occurrences: 1,
        }),
      ]),
    });
  });

  it("keeps bundled singleton aliases canonical in usage inventory", () => {
    const usage = deriveScriptApiUsage([
      parse("bundle/scripts/main.js", `
        import { world as world13, system as system8 } from "@minecraft/server";
        world13.afterEvents.playerSpawn.subscribe(() => {});
        system8.afterEvents.scriptEventReceive.subscribe(() => {});
        world13.getDimension("overworld");
      `),
    ]);

    expect(usage.symbols).toEqual(expect.arrayContaining([
      expect.objectContaining({ symbol: "world.afterEvents.playerSpawn" }),
      expect.objectContaining({ symbol: "system.afterEvents.scriptEventReceive" }),
      expect.objectContaining({
        symbol: "world.getDimension",
        directOccurrences: 1,
      }),
    ]));
    expect(usage.symbols.some((item) => item.symbol.startsWith("unknown."))).toBe(false);
  });

  it("ranks portfolio promotion candidates by real map coverage before raw frequency", () => {
    const mapA = deriveScriptApiUsage([
      parse("a/scripts/main.js", `
        import { world } from "@minecraft/server";
        world.scoreboard.someFutureMethod("round");
        world.scoreboard.someFutureMethod("score");
        world.afterEvents.playerSpawn.subscribe(() => {});
      `),
    ]);
    const mapB = deriveScriptApiUsage([
      parse("b/scripts/main.js", `
        import { world } from "@minecraft/server";
        world.scoreboard.someFutureMethod("round");
        world.getDimension("overworld");
      `),
    ]);

    const portfolio = aggregateScriptApiUsage([
      { mapId: "map-a", usage: mapA },
      { mapId: "map-b", usage: mapB },
    ]);

    expect(portfolio.promotionCandidates[0]).toMatchObject({
      symbol: "Scoreboard.someFutureMethod",
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
