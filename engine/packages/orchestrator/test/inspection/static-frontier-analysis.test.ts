import { describe, expect, it } from "vitest";
import {
  analyzeEntityTransitionIntegrity,
  analyzeInteractiveBlockComponents,
  analyzeScoreboardFakeParticipants,
} from "../../src/inspection/static-frontier-analysis.js";
import { parseEntityDefinition } from "../../../../analyzers/entities/src/index.js";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";

const source = { artifactId: "fixture", relativePath: "fixture.json" };

describe("static frontier analysis", () => {
  it("classifies authored block component surfaces", () => {
    expect(analyzeInteractiveBlockComponents({
      source,
      components: {
        "minecraft:inventory": {},
        "minecraft:redstone_consumer": {},
      },
    }).map((item) => item.surface)).toEqual(["container", "redstone"]);
  });

  it("finds entity event references to missing groups/events", () => {
    const entity = parseEntityDefinition({
      "minecraft:entity": {
        component_groups: { active: {} },
        events: {
          start: {
            add: { component_groups: ["missing"] },
            trigger: "missing_event",
          },
        },
      },
    }, source);
    expect(analyzeEntityTransitionIntegrity(entity)[0]).toMatchObject({
      missingGroups: ["missing"],
      missingTriggeredEvents: ["missing_event"],
    });
  });

  it("distinguishes literal fake-player scoreboard participants", () => {
    const script = parseScriptFile(
      "main",
      'player.runCommand("scoreboard players set $global state 1");',
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    expect(analyzeScoreboardFakeParticipants([script])[0]).toMatchObject({
      participant: "$global",
      objective: "state",
    });
  });
});
