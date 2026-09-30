import { describe, expect, it } from "vitest";
import { parseEntityDefinition } from "../src/parse.js";
import { analyzeEntityTransitionReachability } from "../src/reachability.js";

describe("entity transition reachability", () => {
  it("detects undefined sensor events and missing component groups", () => {
    const entity = parseEntityDefinition({
      "minecraft:entity": {
        component_groups: {
          hostile: { "minecraft:behavior.melee_attack": {} },
        },
        components: {
          "minecraft:environment_sensor": {
            triggers: [{ event: "demo:missing" }],
          },
        },
        events: {
          "demo:start": {
            add: { component_groups: ["missing_group"] },
            trigger: "demo:next",
          },
        },
      },
    }, { artifactId: "fixture", relativePath: "entities/demo.json" });

    const result = analyzeEntityTransitionReachability(entity);

    expect(result.undefinedSensorEvents).toEqual(["demo:missing"]);
    expect(result.undefinedTriggeredEvents).toEqual(["demo:next"]);
    expect(result.missingComponentGroups).toEqual([
      { event: "demo:start", group: "missing_group", operation: "add" },
    ]);
  });

  it("follows defined sensor-rooted event chains", () => {
    const entity = parseEntityDefinition({
      "minecraft:entity": {
        components: {
          "minecraft:environment_sensor": {
            triggers: [{ event: "demo:start" }],
          },
        },
        events: {
          "demo:start": { trigger: "demo:combat" },
          "demo:combat": {},
          "demo:external_only": {},
        },
      },
    }, { artifactId: "fixture", relativePath: "entities/demo.json" });

    const result = analyzeEntityTransitionReachability(entity);

    expect(result.reachableEvents).toEqual(["demo:combat", "demo:start"]);
    expect(result.internallyUnreachedEvents).toEqual(["demo:external_only"]);
    expect(result.unresolvedReachabilityEvents).toEqual(["demo:external_only"]);
  });

  it("separates external roots from unresolved reachability", () => {
    const entity = parseEntityDefinition({
      "minecraft:entity": {
        events: {
          "minecraft:entity_spawned": { trigger: "demo:spawn_ready" },
          "demo:spawn_ready": {},
          "demo:external": { trigger: "demo:external_next" },
          "demo:external_next": {},
          "demo:unknown": {},
        },
      },
    }, { artifactId: "fixture", relativePath: "entities/demo.json" });

    const result = analyzeEntityTransitionReachability(entity, {
      externalRootEvents: ["demo:external"],
    });

    expect(result.externalRootEvents).toEqual([
      "demo:external",
      "minecraft:entity_spawned",
    ]);
    expect(result.externallyReachableEvents).toEqual([
      "demo:external",
      "demo:external_next",
      "demo:spawn_ready",
      "minecraft:entity_spawned",
    ]);
    expect(result.unresolvedReachabilityEvents).toEqual(["demo:unknown"]);
  });
});
