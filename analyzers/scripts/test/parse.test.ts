import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../src/parse.js";
import { resolveScriptImports } from "../src/resolve.js";
import { summarizeMinecraftModules } from "../src/module-usage.js";

const source = {
  artifactId: "art_demo",
  relativePath: "behavior_packs/demo/scripts/main.ts",
};

describe("script analyzer", () => {
  it("extracts Minecraft imports, event subscriptions and dynamic properties", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world, system } from "@minecraft/server";
import { helper } from "./helper";

world.afterEvents.playerSpawn.subscribe((event) => {
  event.player.setDynamicProperty("joined", true);
});

system.afterEvents.scriptEventReceive.subscribe(() => {});
`,
      source,
    );

    expect(parsed.imports.some((item) => item.module === "@minecraft/server")).toBe(true);
    expect(parsed.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        root: "world",
        phase: "afterEvents",
        event: "playerSpawn",
      }),
      expect.objectContaining({
        root: "system",
        phase: "afterEvents",
        event: "scriptEventReceive",
      }),
    ]));
    expect(parsed.dynamicProperties).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: "set", propertyId: "joined" }),
    ]));
  });

  it("extracts direct world and system method symbols without guessing nested receiver types", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
import { world, system } from "@minecraft/server";

world.getAllPlayers();
world.getDimension("overworld");
system.runInterval(() => {}, 1);
world.scoreboard.getObjective("round");
`,
      source,
    );

    expect(parsed.methodCalls).toEqual([
      expect.objectContaining({ symbol: "world.getAllPlayers" }),
      expect.objectContaining({ symbol: "world.getDimension" }),
      expect.objectContaining({ symbol: "system.runInterval" }),
    ]);
  });

  it("resolves relative script imports and summarizes Minecraft modules", () => {
    const main = parseScriptFile(
      "scripts/main",
      'import { world } from "@minecraft/server";\nimport "./helper";',
      source,
    );
    const helper = parseScriptFile(
      "scripts/helper",
      "export const helper = 1;",
      {
        artifactId: "art_demo",
        relativePath: "behavior_packs/demo/scripts/helper.ts",
      },
    );

    expect(resolveScriptImports([main, helper])).toEqual(expect.arrayContaining([
      expect.objectContaining({
        module: "./helper",
        status: "resolved",
        targetIdentifier: "scripts/helper",
      }),
    ]));

    expect(summarizeMinecraftModules([main, helper])).toEqual([
      {
        module: "@minecraft/server",
        files: ["scripts/main"],
        bindings: ["world"],
      },
    ]);
  });
});
