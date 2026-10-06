import { describe, expect, it } from "vitest";
import {
  analyzeEntityAiStacks,
} from "../../src/inspection/entity-ai-stack-analysis.js";

const source = {
  artifactId: "fixture",
  relativePath: "entities/test.json",
};

describe("entity AI stack analysis", () => {
  it("marks targeted movement stack complete when movement, navigation, target, and movement goal coexist", () => {
    const result = analyzeEntityAiStacks([
      {
        identifier: "fixture:zombie",
        source,
        baseComponents: [
          "minecraft:movement",
          "minecraft:navigation.walk",
          "minecraft:behavior.nearest_attackable_target",
          "minecraft:behavior.melee_attack",
        ],
        baseComponentData: {
          "minecraft:movement": {
            value: 0.25,
          },
          "minecraft:navigation.walk": {},
          "minecraft:behavior.nearest_attackable_target": {
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
          },
        },
        componentGroups: {},
        componentGroupData: {},
        events: {},
      },
    ]);

    expect(result.targetedStackComplete)
      .toBeGreaterThan(0);
    expect(result.targetedStackIncomplete)
      .toBe(0);
  });

  it("surfaces duplicate movement-goal priorities without inventing runtime arbitration", () => {
    const result = analyzeEntityAiStacks([
      {
        identifier: "fixture:zombie",
        source,
        baseComponents: [
          "minecraft:movement",
          "minecraft:navigation.walk",
          "minecraft:behavior.nearest_attackable_target",
          "minecraft:behavior.melee_attack",
          "minecraft:behavior.random_stroll",
        ],
        baseComponentData: {
          "minecraft:movement": {
            value: 0.25,
          },
          "minecraft:navigation.walk": {},
          "minecraft:behavior.nearest_attackable_target": {
            priority: 1,
          },
          "minecraft:behavior.melee_attack": {
            priority: 2,
          },
          "minecraft:behavior.random_stroll": {
            priority: 2,
          },
        },
        componentGroups: {},
        componentGroupData: {},
        events: {},
      },
    ]);

    expect(
      result.goalPriorityConflictStates,
    ).toBe(1);
    expect(
      result.assessments[0]
        ?.duplicateMovementGoalPriorities,
    ).toEqual([2]);
  });

  it("keeps missing navigation as an explicit targeted stack gap", () => {
    const result = analyzeEntityAiStacks([
      {
        identifier: "fixture:zombie",
        source,
        baseComponents: [
          "minecraft:movement",
          "minecraft:behavior.nearest_attackable_target",
          "minecraft:behavior.melee_attack",
        ],
        baseComponentData: {
          "minecraft:movement": {
            value: 0.25,
          },
          "minecraft:behavior.nearest_attackable_target": {
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
          },
        },
        componentGroups: {},
        componentGroupData: {},
        events: {},
      },
    ]);

    expect(result.targetedStackIncomplete)
      .toBeGreaterThan(0);
    expect(result.targetedWithoutNavigation)
      .toBeGreaterThan(0);
    expect(
      result.assessments.some(
        (item) =>
          item.missingSurfaces.includes(
            "navigation",
          ),
      ),
    ).toBe(true);
  });
});
