import { describe, expect, it } from "vitest";
import { parseEntityDefinition } from "../../../../analyzers/entities/src/index.js";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeEnvironmentHazards } from "../../src/inspection/environment-hazard-analysis.js";

describe("environment hazard analysis", () => {
  it("separates pre-mutation and post-explosion observation", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.beforeEvents.explosion.subscribe((event) => { event.cancel = true; });",
        "world.afterEvents.explosion.subscribe(() => {});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeEnvironmentHazards(
      [script],
      [],
    );

    expect(result).toMatchObject({
      explosionBeforeHandlers: 1,
      explosionAfterHandlers: 1,
      explosionControlStatus:
        "pre-mutation-control-present",
      explosionContainmentStatus:
        "unresolved",
    });
  });

  it("inventories environmental damage components across base and groups", () => {
    const entity = parseEntityDefinition(
      {
        "minecraft:entity": {
          description: {
            identifier: "demo:hazard_actor",
          },
          components: {
            "minecraft:hurt_on_condition": {
              damage_conditions: [],
            },
          },
          component_groups: {
            shielded: {
              "minecraft:damage_sensor": {
                triggers: [],
              },
            },
          },
        },
      },
      {
        artifactId: "fixture",
        relativePath: "entities/hazard.json",
      },
    );

    const result = analyzeEnvironmentHazards(
      [],
      [entity],
    );

    expect(result).toMatchObject({
      hurtOnConditionEntities: 1,
      damageSensorEntities: 1,
      repeatedDamageStatus:
        "generation-policy-unresolved",
    });
    expect(result.hazardEntities[0]).toMatchObject({
      entityIdentifier: "demo:hazard_actor",
      hurtOnCondition: true,
      damageSensor: true,
    });
  });

  it("does not invent hazard obligations when no hazard surface exists", () => {
    expect(
      analyzeEnvironmentHazards([], []),
    ).toMatchObject({
      explosionControlStatus: "absent",
      explosionContainmentStatus:
        "not-applicable",
      repeatedDamageStatus:
        "not-applicable",
    });
  });
});
