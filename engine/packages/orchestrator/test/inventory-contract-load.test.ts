import { describe, expect, it } from "vitest";
import {
  parseInventoryItemBehaviorContract,
} from "../src/inventory-contract-load.js";

describe("inventory item contract parser", () => {
  it("parses explicit ownership, drop, reset, and restore rules", () => {
    expect(
      parseInventoryItemBehaviorContract({
        schemaVersion: 1,
        id: "arena-items",
        rules: [
          {
            id: "upgrade-sword",
            itemClass: "minecraft:diamond_sword",
            ownershipScope: "round",
            dropAllowed: false,
            resetOn: ["round-end", "arena-end"],
            restoreOn: ["respawn"],
          },
        ],
      }),
    ).toEqual({
      schemaVersion: 1,
      id: "arena-items",
      rules: [
        {
          id: "upgrade-sword",
          itemClass: "minecraft:diamond_sword",
          ownershipScope: "round",
          dropAllowed: false,
          resetOn: ["round-end", "arena-end"],
          restoreOn: ["respawn"],
        },
      ],
    });
  });

  it("rejects invalid transitions instead of accepting typos", () => {
    expect(() =>
      parseInventoryItemBehaviorContract({
        schemaVersion: 1,
        id: "invalid",
        rules: [
          {
            id: "bad",
            itemClass: "minecraft:stone",
            ownershipScope: "round",
            dropAllowed: false,
            resetOn: ["round_end"],
          },
        ],
      }),
    ).toThrow(/invalid resetOn transition/);
  });

  it("rejects durable items with automatic reset transitions", () => {
    expect(() =>
      parseInventoryItemBehaviorContract({
        schemaVersion: 1,
        id: "invalid-durable",
        rules: [
          {
            id: "durable",
            itemClass: "minecraft:clock",
            ownershipScope: "player-durable",
            dropAllowed: true,
            resetOn: ["round-end"],
          },
        ],
      }),
    ).toThrow(/Player-durable item contract rule/);
  });
});
