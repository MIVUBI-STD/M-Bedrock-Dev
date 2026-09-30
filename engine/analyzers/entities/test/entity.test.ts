import { describe, expect, it } from "vitest";
import {
  deriveEntityStateGraph,
  parseEntityDefinition,
} from "../src/index.js";

describe("entity definition analysis", () => {
  it("extracts base components, groups and nested event mutations", () => {
    const parsed = parseEntityDefinition({
      format_version: "1.21.0",
      "minecraft:entity": {
        description: {
          identifier: "demo:zombie",
          runtime_identifier: "minecraft:zombie",
        },
        components: {
          "minecraft:health": { value: 20 },
        },
        component_groups: {
          "demo:hostile": {
            "minecraft:behavior.move_towards_target": { priority: 2 },
            "minecraft:behavior.nearest_attackable_target": { priority: 1 },
          },
        },
        events: {
          "demo:become_hostile": {
            sequence: [{
              add: { component_groups: ["demo:hostile"] },
            }, {
              trigger: "demo:announce",
            }],
          },
        },
      },
    }, {
      artifactId: "fixture",
      relativePath: "behavior_packs/demo/entities/zombie.json",
    });

    expect(parsed.identifier).toBe("demo:zombie");
    expect(parsed.runtimeIdentifier).toBe("minecraft:zombie");
    expect(parsed.baseComponents).toEqual(["minecraft:health"]);
    expect(parsed.componentGroups["demo:hostile"]).toEqual([
      "minecraft:behavior.move_towards_target",
      "minecraft:behavior.nearest_attackable_target",
    ]);
    expect(parsed.events["demo:become_hostile"]).toMatchObject({
      addGroups: ["demo:hostile"],
      triggerEvents: ["demo:announce"],
    });
  });

  it("derives separate possible states instead of merging unrelated groups", () => {
    const parsed = parseEntityDefinition({
      "minecraft:entity": {
        components: { "minecraft:health": {} },
        component_groups: {
          a: { "minecraft:behavior.move_towards_target": {} },
          b: { "minecraft:behavior.nearest_attackable_target": {} },
        },
        events: {
          enable_a: { add: { component_groups: ["a"] } },
        },
      },
    }, { artifactId: "fixture", relativePath: "entities/demo.json" });

    const graph = deriveEntityStateGraph(parsed);
    const stateA = graph.candidates.find((item) => item.id === "group:a");
    expect(stateA?.activeComponents).not.toContain(
      "minecraft:behavior.nearest_attackable_target",
    );
  });
});
