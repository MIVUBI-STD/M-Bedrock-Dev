import { describe, expect, it } from "vitest";
import {
  extractEntityLootSemantics,
  parseEntityDefinition,
} from "../src/index.js";

describe("entity loot semantics", () => {
  it("extracts minecraft:loot tables from entity states", () => {
    const entity = parseEntityDefinition(
      {
        format_version: "1.21.0",
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

    const result =
      extractEntityLootSemantics(entity);

    expect(result).toMatchObject({
      entityKey: "demo:zombie",
      configuredStates: 1,
      lootTables: [
        "loot_tables/entities/zombie.json",
      ],
    });
  });
});
