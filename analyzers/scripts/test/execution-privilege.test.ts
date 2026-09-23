import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../src/parse.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script execution privilege analysis", () => {
  it("captures known world-state mutation calls inside before events", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
        import { world } from "@minecraft/server";
        world.beforeEvents.playerBreakBlock.subscribe((event) => {
          event.player.setGameMode("creative");
          event.player.getGameMode();
        });
      `,
      source,
    );

    expect(parsed.restrictedMutations).toEqual([
      expect.objectContaining({
        root: "world",
        event: "playerBreakBlock",
        method: "setGameMode",
      }),
    ]);
  });

  it("marks startup before-event as early execution", () => {
    const parsed = parseScriptFile(
      "scripts/main",
      `
        import { system } from "@minecraft/server";
        system.beforeEvents.startup.subscribe(() => {});
      `,
      source,
    );

    expect(parsed.capabilities).toEqual(expect.arrayContaining([
      expect.objectContaining({
        capability: "early-execution",
        detail: "system.beforeEvents.startup",
      }),
    ]));
  });
});
