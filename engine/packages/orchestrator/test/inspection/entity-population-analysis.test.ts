import {
  describe,
  expect,
  it,
} from "vitest";
import {
  parseEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";
import {
  analyzeEntityPopulationSources,
  entityPopulationSourceDiagnostics,
} from "../../src/inspection/entity-population-analysis.js";

const source = {
  artifactId: "fixture",
  relativePath:
    "behavior_packs/demo/entities/enemy.json",
};

describe("entity population source analysis", () => {
  it("classifies base and component-group autonomous spawn sources", () => {
    const entity =
      parseEntityDefinition({
        "minecraft:entity": {
          description: {
            identifier:
              "demo:enemy",
          },
          components: {
            "minecraft:spawn_on_death": {
              entity_type:
                "demo:child",
            },
          },
          component_groups: {
            spawner: {
              "minecraft:behavior.spawn_entity": {
                entities: [],
              },
            },
          },
        },
      }, source);

    const result =
      analyzeEntityPopulationSources([
        entity,
      ]);

    expect(
      result.spawnEntitySources,
    ).toBe(1);
    expect(
      result.spawnOnDeathSources,
    ).toBe(1);
    expect(
      result.autonomousSpawnSources,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spawn-on-death",
          scope: "base",
        }),
        expect.objectContaining({
          kind: "spawn-entity",
          scope:
            "component-group",
          componentGroup:
            "spawner",
        }),
      ]),
    );
  });

  it("emits evidence diagnostics without promoting autonomous spawning to a defect", () => {
    const entity =
      parseEntityDefinition({
        "minecraft:entity": {
          description: {
            identifier:
              "demo:enemy",
          },
          components: {
            "minecraft:spawn_on_death": {},
          },
        },
      }, source);

    const findings =
      entityPopulationSourceDiagnostics(
        analyzeEntityPopulationSources([
          entity,
        ]),
      );

    expect(findings).toEqual([
      expect.objectContaining({
        code:
          "ENTITY_AUTONOMOUS_SPAWN_SOURCE",
        severity: "info",
      }),
    ]);
  });
});
