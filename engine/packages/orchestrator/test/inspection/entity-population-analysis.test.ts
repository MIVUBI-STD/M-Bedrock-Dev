import {
  describe,
  expect,
  it,
} from "vitest";
import {
  parseEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";
import {
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
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


describe("population path and disappearance classification", () => {
  it("classifies script, command, natural, and autonomous spawn paths separately", () => {
    const script = parseScriptFile(
      "main",
      [
        "dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "dimension.runCommand('summon demo:enemy 0 0 0');",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );
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

    const result =
      analyzeEntityPopulationSources(
        [entity],
        [script],
        {
          naturalMobSpawning:
            "enabled",
        },
      );

    expect(
      Object.fromEntries(
        result.spawnPaths.map(
          (item) => [
            item.kind,
            item.count,
          ],
        ),
      ),
    ).toMatchObject({
      NATURAL_RULE: 1,
      SCRIPT_SPAWN: 1,
      COMMAND_SUMMON: 1,
      SPAWN_ON_DEATH: 1,
    });
  });

  it("requires death, remove, and load observation before disappearance is fully separated", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityDie.subscribe(() => {});",
        "world.afterEvents.entityRemove.subscribe(() => {});",
        "world.afterEvents.entityLoad.subscribe(() => {});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    expect(
      analyzeEntityPopulationSources(
        [],
        [script],
      ).disappearance.classification,
    ).toBe(
      "death-remove-load-separated",
    );
  });

  it("accepts generation-bound registry ownership as natural-spawn isolation proof", () => {
    expect(
      analyzeEntityPopulationSources(
        [],
        [],
        {
          naturalMobSpawning:
            "enabled",
          generationBoundRegistryAuthorities:
            1,
        },
      ).naturalSpawnIsolation,
    ).toBe("registry-isolated");
  });
});


describe("spawn intent and replacement lineage", () => {
  it("accepts only a structurally complete spawn intent token", () => {
    const script = parseScriptFile(
      "main",
      [
        "const intent = {",
        "  arenaGeneration: 2,",
        "  waveGeneration: 4,",
        "  spawnOperationId: 'wave-4-a',",
        "  expectedEntityType: 'demo:enemy',",
        "  expectedCount: 3,",
        "};",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeEntityPopulationSources(
        [],
        [script],
      );

    expect(
      result.completeSpawnIntents,
    ).toBe(1);
    expect(
      result.spawnIntents[0]
        ?.missingFields,
    ).toEqual([]);
  });

  it("keeps partial intent-like objects unresolved", () => {
    const script = parseScriptFile(
      "main",
      [
        "const intent = {",
        "  arenaGeneration: 2,",
        "  expectedCount: 3,",
        "};",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeEntityPopulationSources(
        [],
        [script],
      );

    expect(
      result.incompleteSpawnIntents,
    ).toBe(1);
    expect(
      result.spawnIntents[0]
        ?.missingFields,
    ).toContain(
      "spawnOperationId",
    );
  });

  it("keeps autonomous replacement lineage unresolved without explicit inheritance metadata", () => {
    const entity =
      parseEntityDefinition({
        "minecraft:entity": {
          description: {
            identifier:
              "demo:parent",
          },
          components: {
            "minecraft:spawn_on_death": {
              entity_type:
                "demo:child",
            },
          },
        },
      }, source);

    expect(
      analyzeEntityPopulationSources([
        entity,
      ]).replacementLineage,
    ).toBe(
      "declared-but-inheritance-unproven",
    );
  });

  it("accepts explicit parent-generation-role inheritance evidence", () => {
    const entity =
      parseEntityDefinition({
        "minecraft:entity": {
          description: {
            identifier:
              "demo:parent",
          },
          components: {
            "minecraft:spawn_on_death": {},
          },
        },
      }, source);
    const script = parseScriptFile(
      "main",
      [
        "const lineage = {",
        "  parentEntityId,",
        "  arenaGeneration,",
        "  objectiveRole,",
        "};",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    expect(
      analyzeEntityPopulationSources(
        [entity],
        [script],
      ).replacementLineage,
    ).toBe("explicit");
  });
});
