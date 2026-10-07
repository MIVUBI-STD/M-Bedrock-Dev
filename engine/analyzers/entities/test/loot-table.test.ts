import { describe, expect, it } from "vitest";
import { analyzeLootTableStructure } from "../src/loot-table.js";

describe("loot table structure", () => {
  it("preserves multiple pools and per-pool conditions", () => {
    const result = analyzeLootTableStructure({
      pools: [
        { rolls: 1, entries: [{ type: "item", name: "minecraft:apple" }] },
        {
          rolls: 1,
          conditions: [{ condition: "killed_by_player" }],
          entries: [{ type: "item", name: "minecraft:emerald" }],
        },
      ],
    });
    expect(result.poolCount).toBe(2);
    expect(result.conditional).toBe(true);
    expect(result.pools[1]).toMatchObject({ conditionCount: 1, entryCount: 1 });
  });
});
