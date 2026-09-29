import { describe, expect, it } from "vitest";
import {
  parseInventoryItemPolicy,
} from "../src/inventory-policy-load.js";

describe("inventory item policy parser", () => {
  it("parses explicit ownership, drop, reset, and restore rules", () => {
    expect(
      parseInventoryItemPolicy({
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
      parseInventoryItemPolicy({
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
      parseInventoryItemPolicy({
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
    ).toThrow(/Player-durable item policy rule/);
  });
});
