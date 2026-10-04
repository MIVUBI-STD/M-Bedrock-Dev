import { describe, expect, it } from "vitest";
import {
  buildGameplayReachabilityGraph,
} from "../../src/inspection/gameplay-reachability-stage.js";
import {
  findGameplayReachability,
} from "../../../diagnostic-reasoning/src/index.js";

describe("gameplay reachability stage", () => {
  it("projects player item acquisition without item-specific rules", () => {
    const graph =
      buildGameplayReachabilityGraph([
        {
          parsed: {
            identifier: "gameplay",
            source: {
              artifactId: "map",
              relativePath: "scripts/gameplay.ts",
            },
            inventoryLifecycleEvidence: [
              {
                kind: "item-grant",
                executionRegion:
                  "function:giveReward",
                subjectExpression:
                  "player.inventory",
                itemIdentifier:
                  "custom:access_token",
                source: {
                  artifactId: "map",
                  relativePath:
                    "scripts/gameplay.ts",
                  range: {
                    lineStart: 12,
                    lineEnd: 12,
                  },
                },
              },
            ],
            commandLiterals: [],
          } as any,
          text: "",
        },
      ]);

    expect(
      findGameplayReachability(
        graph,
        "item:custom:access_token",
      ).reachable,
    ).toBe(true);
  });

  it("indexes mcstructure container items without assuming the container is player-accessible", () => {
    const graph = buildGameplayReachabilityGraph(
      [],
      [],
      [{
        identifier: "levels/chest_build",
        node: {
          kind: "structure",
          source: {
            artifactId: "map",
            relativePath: "structures/chest_build.mcstructure",
          },
        } as any,
        containerItems: [{
          flatIndex: 7,
          itemId: "minecraft:oak_planks",
          count: 16,
        }],
      }],
    );

    const plank = graph.nodes.find(
      (node) => node.id === "item:minecraft:oak_planks",
    );
    const container = graph.nodes.find(
      (node) => node.kind === "container",
    );
    expect(plank?.evidenceIds).toContain(
      "structures/chest_build.mcstructure#container:7",
    );
    expect(container?.playerAccessible).not.toBe(true);
    expect(
      findGameplayReachability(
        graph,
        "item:minecraft:oak_planks",
      ).resolution,
    ).toBe("unknown");
    expect(graph.coverage?.sources).toContain(
      "mcstructure-container-contents",
    );
  });
});


describe("gameplay recipe reachability", () => {
  it("follows a single-ingredient behavior-pack recipe without item-specific rules", () => {
    const graph =
      buildGameplayReachabilityGraph(
        [{
          parsed: {
            identifier: "grant",
            source: {
              artifactId: "map",
              relativePath: "scripts/grant.ts",
            },
            inventoryLifecycleEvidence: [{
              kind: "item-grant",
              executionRegion: "function:grant",
              subjectExpression: "player.inventory",
              itemIdentifier: "custom:material",
              source: {
                artifactId: "map",
                relativePath: "scripts/grant.ts",
                range: {
                  lineStart: 1,
                  lineEnd: 1,
                },
              },
            }],
            commandLiterals: [],
          } as any,
        }],
        [{
          id: "recipe:test",
          identity: {
            kind: "recipe",
            scope: "project",
            identifier: "recipes/test",
          },
          kind: "recipe",
          identifier: "recipes/test",
          source: {
            artifactId: "map",
            relativePath: "behavior_packs/BP/recipes/test.json",
          },
          data: {
            "minecraft:recipe_shapeless": {
              ingredients: [{
                item: "custom:material",
              }],
              result: {
                item: "custom:trigger_tool",
              },
            },
          },
        } as any],
      );

    expect(
      findGameplayReachability(
        graph,
        "item:custom:trigger_tool",
      ),
    ).toMatchObject({
      reachable: true,
      resolution: "reachable",
    });
    expect(
      graph.coverage?.sources,
    ).toContain(
      "behavior-pack-recipes",
    );
  });

  it("does not falsely prove a multi-ingredient recipe from one reachable input", () => {
    const graph =
      buildGameplayReachabilityGraph(
        [{
          parsed: {
            identifier: "grant",
            source: {
              artifactId: "map",
              relativePath: "scripts/grant.ts",
            },
            inventoryLifecycleEvidence: [{
              kind: "item-grant",
              executionRegion: "function:grant",
              subjectExpression: "player.inventory",
              itemIdentifier: "custom:a",
              source: {
                artifactId: "map",
                relativePath: "scripts/grant.ts",
              },
            }],
            commandLiterals: [],
          } as any,
        }],
        [{
          id: "recipe:test",
          identity: {
            kind: "recipe",
            scope: "project",
            identifier: "recipes/test",
          },
          kind: "recipe",
          identifier: "recipes/test",
          source: {
            artifactId: "map",
            relativePath: "behavior_packs/BP/recipes/test.json",
          },
          data: {
            "minecraft:recipe_shapeless": {
              ingredients: [{
                item: "custom:a",
              }, {
                item: "custom:b",
              }],
              result: {
                item: "custom:result",
              },
            },
          },
        } as any],
      );

    expect(
      findGameplayReachability(
        graph,
        "item:custom:result",
      ).resolution,
    ).not.toBe("reachable");
    expect(
      graph.coverage?.gaps,
    ).toContain(
      "multi-ingredient-or-tag-recipes",
    );
  });
});
