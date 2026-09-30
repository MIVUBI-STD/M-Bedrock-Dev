import { describe, expect, it } from "vitest";
import { extractNavigationCapabilities } from "../src/navigation.js";

describe("entity navigation capabilities", () => {
  it("derives door and water capabilities from active navigation config", () => {
    const result = extractNavigationCapabilities({
      id: "fixture",
      activeComponents: ["minecraft:navigation.walk"],
      activeComponentData: {
        "minecraft:navigation.walk": {
          can_pass_doors: true,
          can_open_doors: true,
          can_break_doors: false,
          can_path_over_water: true,
          avoid_damage_blocks: true,
        },
      },
      activeGroups: [],
    });

    expect(result.capabilities).toEqual(expect.arrayContaining([
      "navigation:path-through-doors",
      "navigation:can-open-doors",
      "navigation:path-over-water",
      "navigation:avoid-damage-blocks",
    ]));
    expect(result.capabilities).not.toContain("navigation:can_break_doors");
  });
});
