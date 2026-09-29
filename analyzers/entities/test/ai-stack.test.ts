import { describe, expect, it } from "vitest";
import {
  extractEntityAiStackSemantics,
} from "../src/ai-stack.js";

describe("entity AI stack semantics", () => {
  it("summarizes movement, navigation, targeting, attack, and movement-goal candidates", () => {
    const result =
      extractEntityAiStackSemantics({
        id: "combat",
        activeComponents: [
          "minecraft:movement",
          "minecraft:navigation.walk",
          "minecraft:behavior.nearest_attackable_target",
          "minecraft:behavior.melee_attack",
        ],
        activeComponentData: {
          "minecraft:movement": {
            value: 0.25,
          },
          "minecraft:navigation.walk": {
            can_walk: true,
          },
          "minecraft:behavior.nearest_attackable_target": {
            priority: 1,
            entity_types: [
              {
                filters: {
                  test: "is_family",
                  value: "player",
                },
              },
            ],
          },
          "minecraft:behavior.melee_attack": {
            priority: 2,
            track_target: true,
          },
        },
        activeGroups: [],
      });

    expect(result.staticSignals).toEqual({
      movementPresent: true,
      navigationPresent: true,
      targetingProviderPresent: true,
      attackBehaviorPresent: true,
      movementGoalCandidatePresent: true,
    });
    expect(
      result.movementGoalCandidates,
    ).toContain(
      "minecraft:behavior.melee_attack",
    );
    expect(
      result.goals.find(
        (goal) =>
          goal.component ===
          "minecraft:behavior.melee_attack",
      )?.priority,
    ).toBe(2);
  });

  it("does not invent target or movement-goal readiness when those surfaces are absent", () => {
    const result =
      extractEntityAiStackSemantics({
        id: "navigation-only",
        activeComponents: [
          "minecraft:movement",
          "minecraft:navigation.walk",
        ],
        activeComponentData: {
          "minecraft:movement": {
            value: 0.2,
          },
          "minecraft:navigation.walk": {},
        },
        activeGroups: [],
      });

    expect(
      result.staticSignals
        .targetingProviderPresent,
    ).toBe(false);
    expect(
      result.staticSignals
        .movementGoalCandidatePresent,
    ).toBe(false);
  });
});
