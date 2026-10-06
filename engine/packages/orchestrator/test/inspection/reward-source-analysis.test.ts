import { describe, expect, it } from "vitest";
import {
  parseEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";
import {
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeRewardSources,
} from "../../src/inspection/reward-source-analysis.js";

describe("reward source analysis", () => {
  it("surfaces engine/script death reward overlap as a candidate", () => {
    const entity = parseEntityDefinition(
      {
        "minecraft:entity": {
          description: {
            identifier: "demo:zombie",
          },
          components: {
            "minecraft:loot": {
              table:
                "loot_tables/entities/zombie.json",
            },
          },
        },
      },
      {
        artifactId: "fixture",
        relativePath:
          "entities/zombie.json",
      },
    );

    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  if (event.deadEntity.typeId !== 'demo:zombie') return;",
        "  grantReward(event.deadEntity);",
        "});",
        "function grantReward(player) {",
        "  const token = new ItemStack('minecraft:gold_nugget');",
        "  player.getComponent('inventory').container.addItem(token);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeRewardSources(
      [script],
      [],
      [entity],
    );

    expect(result.engineLootEntities).toBe(1);
    expect(result.deathRewardPaths).toBe(1);
    expect(
      result.deathRewardSourceOverlapCandidates,
    ).toBe(1);
    expect(
      result.deathRewardSourceOverlapUnresolved,
    ).toBe(0);
    expect(result.sourceKinds).toEqual(
      expect.arrayContaining([
        "ENGINE_LOOT_TABLE",
        "SCRIPT_INVENTORY_GRANT",
      ]),
    );
  });

  it("keeps generic death reward overlap unresolved without entity binding", () => {
    const entity = parseEntityDefinition(
      {
        "minecraft:entity": {
          description: {
            identifier: "demo:zombie",
          },
          components: {
            "minecraft:loot": {
              table:
                "loot_tables/entities/zombie.json",
            },
          },
        },
      },
      {
        artifactId: "fixture",
        relativePath:
          "entities/zombie.json",
      },
    );

    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  grantReward(event.deadEntity);",
        "});",
        "function grantReward(player) {",
        "  const token = new ItemStack('minecraft:gold_nugget');",
        "  player.getComponent('inventory').container.addItem(token);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeRewardSources(
      [script],
      [],
      [entity],
    );

    expect(
      result.deathRewardSourceOverlapCandidates,
    ).toBe(0);
    expect(
      result.deathRewardSourceOverlapUnresolved,
    ).toBe(1);
  });

  it("does not let unrelated global cleanup satisfy a world-drop reward path", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  dropReward(event.deadEntity.dimension);",
        "});",
        "function dropReward(dimension) {",
        "  const token = new ItemStack('minecraft:gold_nugget');",
        "  dimension.spawnItem(token, { x: 0, y: 0, z: 0 });",
        "}",
        "function unrelatedCleanup(item) {",
        "  item.remove();",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeRewardSources(
      [script],
      [],
      [],
    );

    expect(
      result.worldDropRewardPathsWithoutCleanup,
    ).toBe(1);
    expect(result.dropCleanupSurfaces).toBe(1);
  });

  it("finds pickup-to-currency paths without assuming they are defects", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityItemPickup.subscribe((event) => {",
        "  award(event.entity);",
        "});",
        "function award(player) {",
        "  credits.addScore(player, 1);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeRewardSources(
      [script],
      [],
      [],
    );

    expect(result.pickupCurrencyPaths).toBe(1);
    expect(
      result.pickupCurrencyWithoutConsumeCandidates,
    ).toBe(1);
  });

  it("credits a reachable persistent operation guard as reward idempotency evidence", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  award(event.deadEntity, resultId);",
        "});",
        "function award(player, resultId) {",
        "  const applied = world.getDynamicProperty('rewardOp');",
        "  if (applied !== resultId) credits.addScore(player, 1);",
        "  world.setDynamicProperty('rewardOp', resultId);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeRewardSources(
      [script],
      [],
      [],
    );

    expect(result.deathRewardPaths).toBe(1);
    expect(
      result.rewardPathsWithoutIdempotency,
    ).toBe(0);
    expect(result.paths[0]).toMatchObject({
      idempotencyGuards: 1,
      scoreCredits: 1,
    });
  });
});
