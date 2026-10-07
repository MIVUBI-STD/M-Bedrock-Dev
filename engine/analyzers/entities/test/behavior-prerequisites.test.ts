import { describe, expect, it } from "vitest";
import { assessEntityBehaviorPrerequisites } from "../src/behavior-prerequisites.js";

describe("entity behavior prerequisites", () => {
  it("reports missing ranged shooter and melee damage components", () => {
    const result = assessEntityBehaviorPrerequisites({
      id: "combat",
      activeComponents: [
        "minecraft:behavior.ranged_attack",
        "minecraft:behavior.melee_attack",
      ],
      activeComponentData: {
        "minecraft:behavior.ranged_attack": {},
        "minecraft:behavior.melee_attack": {},
      },
      activeGroups: [],
    });

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        behavior: "minecraft:behavior.ranged_attack",
        status: "missing-prerequisite",
        missing: ["minecraft:shooter"],
      }),
      expect.objectContaining({
        behavior: "minecraft:behavior.melee_attack",
        status: "missing-prerequisite",
        missing: ["minecraft:attack"],
      }),
    ]));
  });

  it("checks door pathing and stalk/pounce target prerequisites", () => {
    const result = assessEntityBehaviorPrerequisites({
      id: "movement",
      activeComponents: [
        "minecraft:navigation.walk",
        "minecraft:behavior.open_door",
        "minecraft:behavior.stalk_and_pounce_on_target",
        "minecraft:attack",
      ],
      activeComponentData: {
        "minecraft:navigation.walk": { can_pass_doors: false },
        "minecraft:behavior.open_door": {},
        "minecraft:behavior.stalk_and_pounce_on_target": {},
        "minecraft:attack": { damage: 4 },
      },
      activeGroups: [],
    });

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({
        behavior: "minecraft:behavior.open_door",
        missing: ["navigation:path-through-doors"],
      }),
      expect.objectContaining({
        behavior: "minecraft:behavior.stalk_and_pounce_on_target",
        missing: ["target-acquisition"],
      }),
    ]));
  });
});
