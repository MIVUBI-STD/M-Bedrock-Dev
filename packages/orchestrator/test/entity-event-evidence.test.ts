import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../analyzers/functions/src/parse.js";
import { parseScriptFile } from "../../../analyzers/scripts/src/parse.js";
import { parseEntityDefinition } from "../../../analyzers/entities/src/index.js";
import {
  deriveEntityEventExternalEvidence,
  externalEventRootsForEntity,
} from "../src/entity-event-evidence.js";

describe("entity event external evidence", () => {
  it("collects exact summon events, command strings, and literal triggerEvent calls", () => {
    const fn = parseMcFunction(
      "setup/path",
      "summon daigon:path 1 2 3 0 0 daigon:set_path_0",
      { artifactId: "fixture", relativePath: "functions/setup/path.mcfunction" },
    );
    const script = parseScriptFile(
      "scripts/main",
      `
        const command = "/summon daigon:path 4 5 6 0 0 daigon:set_path_1";
        entity.triggerEvent("daigon:next_path");
      `,
      { artifactId: "fixture", relativePath: "scripts/main.js" },
    );

    const evidence = deriveEntityEventExternalEvidence([fn], [script]);
    expect(evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({
        event: "daigon:set_path_0",
        entityIdentifier: "daigon:path",
        kind: "summon-spawn-event",
      }),
      expect.objectContaining({
        event: "daigon:set_path_1",
        entityIdentifier: "daigon:path",
        kind: "summon-spawn-event",
      }),
      expect.objectContaining({
        event: "daigon:next_path",
        kind: "script-trigger-event",
      }),
    ]));

    const entity = parseEntityDefinition({
      "minecraft:entity": {
        description: { identifier: "daigon:path" },
        events: {
          "daigon:set_path_0": {},
          "daigon:set_path_1": {},
          "daigon:next_path": {},
          "daigon:unused": {},
        },
      },
    }, { artifactId: "fixture", relativePath: "entities/path.json" });

    expect(externalEventRootsForEntity(entity, evidence)).toEqual([
      "daigon:next_path",
      "daigon:set_path_0",
      "daigon:set_path_1",
    ]);
  });
});
