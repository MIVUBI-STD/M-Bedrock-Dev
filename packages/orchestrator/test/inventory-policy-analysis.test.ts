import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../analyzers/scripts/src/index.js";
import {
  analyzeInventoryPolicy,
} from "../src/inventory-policy-analysis.js";

describe("inventory policy analysis", () => {
  it("binds deterministic item drop evidence to authored deny policy", () => {
    const script = parseScriptFile(
      "main",
      [
        "function drop(dimension, location) {",
        "  const sword = new ItemStack('minecraft:diamond_sword');",
        "  dimension.dropItem(sword, location);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeInventoryPolicy(
      [script],
      {
        schemaVersion: 1,
        id: "policy",
        rules: [
          {
            id: "sword",
            itemClass: "minecraft:diamond_sword",
            ownershipScope: "round",
            dropAllowed: false,
            resetOn: ["round-end"],
          },
        ],
      },
    );

    expect(result.deniedDrops).toBe(1);
    expect(result.dropAssessments[0]).toMatchObject({
      itemIdentifier: "minecraft:diamond_sword",
      status: "denied",
      matchedRuleIds: ["sword"],
    });
  });

  it("keeps dynamic drop identity unknown rather than guessing", () => {
    const script = parseScriptFile(
      "main",
      [
        "function drop(dimension, item, location) {",
        "  dimension.dropItem(item, location);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeInventoryPolicy(
      [script],
      {
        schemaVersion: 1,
        id: "policy",
        rules: [],
      },
    );

    expect(result.unknownDrops).toBe(1);
    expect(result.deniedDrops).toBe(0);
  });

  it("does not treat world spawnItem as player-drop policy evidence", () => {
    const script = parseScriptFile(
      "main",
      [
        "function reward(dimension, location) {",
        "  const sword = new ItemStack('minecraft:diamond_sword');",
        "  dimension.spawnItem(sword, location);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeInventoryPolicy(
      [script],
      {
        schemaVersion: 1,
        id: "policy",
        rules: [
          {
            id: "sword",
            itemClass: "minecraft:diamond_sword",
            ownershipScope: "round",
            dropAllowed: false,
            resetOn: ["round-end"],
          },
        ],
      },
    );

    expect(result.dropAssessments).toEqual([]);
    expect(result.deniedDrops).toBe(0);
  });
});
