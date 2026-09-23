import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { parseScriptFile } from "../../../analyzers/scripts/src/parse.js";
import { deriveReliabilityFingerprint } from "../src/reliability-fingerprint.js";

describe("automatic reliability fingerprint", () => {
  it("derives capability and risk tags only from observed facts", () => {
    const fn = parseMcFunction(
      "main",
      [
        "execute as @a run fill 0 0 0 1 1 1 stone",
        "structure load demo:room 0 0 0",
        "scoreboard players set @a active 1",
      ].join("\n"),
      {
        artifactId: "art",
        relativePath: "behavior_packs/demo/functions/main.mcfunction",
      },
    );

    const script = parseScriptFile(
      "scripts/main",
      [
        'import { world } from "@minecraft/server";',
        'world.afterEvents.playerSpawn.subscribe((event) => {',
        '  event.player.setDynamicProperty("joined", true);',
        '});',
      ].join("\n"),
      {
        artifactId: "art",
        relativePath: "behavior_packs/demo/scripts/main.js",
      },
    );

    const result = deriveReliabilityFingerprint({
      mapId: "art",
      artifactFingerprint: "sha",
      packs: [{
        root: "behavior_packs/demo",
        type: "behavior",
        minEngineVersion: "1.21.0",
        educationMetadata: false,
        scriptModules: [{
          moduleName: "@minecraft/server",
          version: "2.0.0-beta",
          track: "beta",
        }],
      }],
      functions: [fn],
      scripts: [script],
      structures: 1,
      parsedStructures: 1,
      entities: 0,
      entityKnowledgeGaps: 0,
      worldDatabasePresent: true,
      stateAccesses: 1,
      broadStateWrites: 1,
      repeatedTopologyCandidates: 1,
      diagnostics: [],
      target: {
        edition: "bedrock",
        experiments: ["Beta APIs"],
      },
    });

    expect(result.fingerprint.commandVerbs).toEqual(expect.arrayContaining([
      "execute",
      "scoreboard",
      "structure",
    ]));
    expect(result.fingerprint.capabilityTags).toEqual(expect.arrayContaining([
      "script-module:@minecraft/server",
      "structure-load",
      "gameplay-state",
      "dynamic-properties",
      "script-events",
      "world-db",
    ]));
    expect(result.fingerprint.riskSurfaces).toEqual(expect.arrayContaining([
      "script-beta",
      "multiplayer-concurrency",
      "repeated-topology",
      "world-db-native",
    ]));

    expect(result.fingerprint.riskSurfaces).not.toContain("entity-ai");
    expect(result.fingerprint.riskSurfaces).not.toContain("chunk-lifecycle");
  });
});
