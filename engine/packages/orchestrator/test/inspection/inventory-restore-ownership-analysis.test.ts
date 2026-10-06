import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeInventoryRestoreOwnership,
} from "../../src/inspection/inventory-restore-ownership-analysis.js";

describe("inventory restore ownership analysis", () => {
  it("detects multiple callback owners granting the same item for one lifecycle event", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.playerSpawn.subscribe((event) => {",
        "  restorePrimary(event.player);",
        "});",
        "world.afterEvents.playerSpawn.subscribe((event) => {",
        "  restoreSecondary(event.player);",
        "});",
        "function restorePrimary(player) {",
        "  const sword = new ItemStack('minecraft:diamond_sword');",
        "  player.getComponent('inventory').container.addItem(sword);",
        "}",
        "function restoreSecondary(player) {",
        "  const sword = new ItemStack('minecraft:diamond_sword');",
        "  player.getComponent('inventory').container.addItem(sword);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeInventoryRestoreOwnership([script]);

    expect(result.restorePathways).toBe(2);
    expect(result.multipleRestoreOwners).toBe(1);
    expect(result.conflicts[0]).toMatchObject({
      lifecycleEvent: "player-spawn",
      itemIdentifier: "minecraft:diamond_sword",
    });
    expect(
      result.conflicts[0]?.ownerCallbackRegions,
    ).toHaveLength(2);
  });

  it("proves duplicate initial-session restore ownership across playerJoin and unguarded playerSpawn", () => {
    const entry = {
      parsed: parseScriptFile(
        "main",
        [
          "world.afterEvents.playerJoin.subscribe((event) => {",
          "  restoreJoin(event.playerId);",
          "});",
          "world.afterEvents.playerSpawn.subscribe((event) => {",
          "  restoreSpawn(event.player);",
          "});",
          "function restoreJoin(player) {",
          "  const sword = new ItemStack('minecraft:diamond_sword');",
          "  player.getComponent('inventory').container.addItem(sword);",
          "}",
          "function restoreSpawn(player) {",
          "  const sword = new ItemStack('minecraft:diamond_sword');",
          "  player.getComponent('inventory').container.addItem(sword);",
          "}",
        ].join("\n"),
        {
          artifactId: "fixture",
          relativePath: "scripts/main.ts",
        },
      ),
      text: [
        "world.afterEvents.playerJoin.subscribe((event) => {",
        "  restoreJoin(event.playerId);",
        "});",
        "world.afterEvents.playerSpawn.subscribe((event) => {",
        "  restoreSpawn(event.player);",
        "});",
        "function restoreJoin(player) {",
        "  const sword = new ItemStack('minecraft:diamond_sword');",
        "  player.getComponent('inventory').container.addItem(sword);",
        "}",
        "function restoreSpawn(player) {",
        "  const sword = new ItemStack('minecraft:diamond_sword');",
        "  player.getComponent('inventory').container.addItem(sword);",
        "}",
      ].join("\n"),
    };

    const result =
      analyzeInventoryRestoreOwnership([entry]);

    expect(
      result.initialSessionDuplicateOwners,
    ).toBe(1);
    expect(result.multipleRestoreOwners).toBe(1);
    expect(
      result.crossLifecycleConflicts[0],
    ).toMatchObject({
      itemIdentifier:
        "minecraft:diamond_sword",
      lifecycleEvents: [
        "player-join",
        "player-spawn",
      ],
    });
  });

  it("does not treat a respawn-only playerSpawn restore as an initial-session duplicate", () => {
    const source = [
      "world.afterEvents.playerJoin.subscribe((event) => {",
      "  restoreJoin(event.playerId);",
      "});",
      "world.afterEvents.playerSpawn.subscribe((event) => {",
      "  if (event.initialSpawn) return;",
      "  restoreSpawn(event.player);",
      "});",
      "function restoreJoin(player) {",
      "  const sword = new ItemStack('minecraft:diamond_sword');",
      "  player.getComponent('inventory').container.addItem(sword);",
      "}",
      "function restoreSpawn(player) {",
      "  const sword = new ItemStack('minecraft:diamond_sword');",
      "  player.getComponent('inventory').container.addItem(sword);",
      "}",
    ].join("\n");
    const result =
      analyzeInventoryRestoreOwnership([{
        parsed: parseScriptFile(
          "main",
          source,
          {
            artifactId: "fixture",
            relativePath: "scripts/main.ts",
          },
        ),
        text: source,
      }]);

    expect(
      result.initialSessionDuplicateOwners,
    ).toBe(0);
    expect(
      result.initialSessionOverlapUnresolved,
    ).toBe(0);
  });

  it("keeps runtime-dynamic restore items unresolved rather than grouping them", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.playerSpawn.subscribe((event) => {",
        "  restore(event.player, chooseItem());",
        "});",
        "function restore(player, item) {",
        "  player.getComponent('inventory').container.addItem(item);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeInventoryRestoreOwnership([script]);

    expect(result.multipleRestoreOwners).toBe(0);
    expect(result.unknownIdentityGrants).toBe(1);
  });
});
