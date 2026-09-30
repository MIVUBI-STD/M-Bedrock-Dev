import { describe, expect, it } from "vitest";
import { parseEntityDefinition, entityRuntimeEvidence } from "../src/index.js";

const source = { artifactId: "fixture", relativePath: "entities/demo.json" };

describe("entity runtime evidence", () => {
  it("marks definite broken transitions absent", () => {
    const entity = parseEntityDefinition({
      "minecraft:entity": {
        component_groups: {
          hostile: { "minecraft:behavior.melee_attack": {} },
        },
        events: {
          "demo:start": {
            add: { component_groups: ["missing_group"] },
            trigger: "demo:missing",
          },
        },
      },
    }, source);

    const records = entityRuntimeEvidence(entity);
    const integrity = records.find((record) => record.predicate === "entity-transition-integrity");
    expect(integrity?.state).toBe("absent");
    expect(integrity?.note).toContain("Definite broken transitions");
  });

  it("does not treat externally unresolved reachability alone as broken integrity", () => {
    const entity = parseEntityDefinition({
      "minecraft:entity": {
        components: { "minecraft:navigation.walk": {} },
        events: {
          "demo:external_only": {},
        },
      },
    }, source);

    const records = entityRuntimeEvidence(entity);
    const integrity = records.find((record) => record.predicate === "entity-transition-integrity");
    expect(integrity?.state).toBe("present");
    expect(records.some((record) => record.predicate === "navigation-component-present")).toBe(true);
  });
});