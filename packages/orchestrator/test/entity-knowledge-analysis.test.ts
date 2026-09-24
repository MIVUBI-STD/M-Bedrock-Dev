import { describe, expect, it } from "vitest";
import { parseEntityDefinition } from "../../../analyzers/entities/src/index.js";
import type { KnowledgeCatalog } from "../../knowledge/src/types.js";
import { analyzeEntityWithKnowledge } from "../src/entity-knowledge-analysis.js";

const catalog: KnowledgeCatalog = {
  schemaVersion: 1,
  sources: [{
    id: "official",
    title: "Official",
    url: "https://learn.microsoft.com/example",
    authority: "official",
    confidence: "documented",
    retrievedDate: "2026-09-23",
  }],
  facts: [],
  relations: [{
    id: "move-needs-target",
    domain: "entity-ai",
    subject: "minecraft:behavior.move_towards_target",
    kind: "requires-any",
    object: "minecraft:behavior.nearest_attackable_target|minecraft:behavior.hurt_by_target",
    applicability: { editions: ["bedrock", "education"] },
    sourceIds: ["official"],
  }],
};

describe("entity knowledge orchestration", () => {
  it("finds a prerequisite gap only in states where the behavior can be active", () => {
    const entity = parseEntityDefinition({
      "minecraft:entity": {
        description: {
          identifier: "demo:mob",
          runtime_identifier: "minecraft:zombie",
        },
        component_groups: {
          moving: { "minecraft:behavior.move_towards_target": {} },
          targeting: { "minecraft:behavior.nearest_attackable_target": {} },
          complete: {
            "minecraft:behavior.move_towards_target": {},
            "minecraft:behavior.nearest_attackable_target": {},
          },
        },
        events: {
          start_complete: { add: { component_groups: ["complete"] } },
        },
      },
    }, { artifactId: "fixture", relativePath: "entities/mob.json" });

    const result = analyzeEntityWithKnowledge(
      entity,
      catalog,
      { edition: "bedrock" },
    );

    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ stateId: "group:moving" }),
    ]));
    expect(result.findings.some((item) => item.stateId === "group:complete")).toBe(false);
    expect(result.staticAnalysisLimits).toHaveLength(1);
  });
});
