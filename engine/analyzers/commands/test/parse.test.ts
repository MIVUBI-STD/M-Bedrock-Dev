import { describe, expect, it } from "vitest";
import { analyzeCommand } from "../src/parse.js";
import { flattenCommandEffects } from "../src/flatten.js";

const source = { artifactId: "art_demo", relativePath: "functions/demo.mcfunction" };

describe("command analyzer", () => {
  it("parses summon as an entity-spawn effect even without a spawn event", () => {
    const result = analyzeCommand(
      "summon minecraft:zombie 1 64 2",
      { artifactId: "a", relativePath: "functions/test.mcfunction" },
    );

    expect(result.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "entity-spawn",
        entityIdentifier: "minecraft:zombie",
        position: {
          x: { mode: "absolute", value: 1 },
          y: { mode: "absolute", value: 64 },
          z: { mode: "absolute", value: 2 },
        },
      }),
    ]));
  });

  it("parses fill into a typed region effect", () => {
    const result = analyzeCommand("fill 8 -47 1 4 -50 1 spruce_wood", source);
    const effect = result.effects[0];
    expect(effect?.kind).toBe("fill");
    if (effect?.kind === "fill") {
      expect(effect.region.from.x).toEqual({ mode: "absolute", value: 8 });
      expect(effect.region.to.y).toEqual({ mode: "absolute", value: -50 });
      expect(effect.block).toBe("spruce_wood");
    }
  });

  it("recursively analyzes execute run commands", () => {
    const result = analyzeCommand(
      "execute as @a at @s run fill 1 2 3 4 5 6 stone",
      source,
    );
    const flat = flattenCommandEffects(result);
    expect(flat.some((effect) => effect.kind === "fill")).toBe(true);
  });

  it("extracts summon spawn events and event-command triggers", () => {
    expect(analyzeCommand(
      "summon daigon:path -17.5 -28.5 -110.51 0 0 daigon:set_path_0",
      source,
    ).effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "entity-event-trigger",
        mechanism: "summon",
        entityIdentifier: "daigon:path",
        event: "daigon:set_path_0",
      }),
    ]));

    expect(analyzeCommand(
      "/event entity @e[type=daigon:path] daigon:next_path",
      source,
    ).effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "entity-event-trigger",
        mechanism: "event-command",
        target: "@e[type=daigon:path]",
        event: "daigon:next_path",
      }),
    ]));
  });

  it("preserves coordinate modes", () => {
    const result = analyzeCommand("tp @s ~1 ~ ^2", source);
    const effect = result.effects.find((item) => item.kind === "teleport");
    expect(effect?.kind).toBe("teleport");
    if (effect?.kind === "teleport") {
      expect(effect.destination.x.mode).toBe("relative");
      expect(effect.destination.z.mode).toBe("local");
    }
  });
});
