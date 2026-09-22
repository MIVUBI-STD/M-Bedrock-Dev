import { describe, expect, it } from "vitest";
import { analyzeCommand } from "../src/parse.js";
import { flattenCommandEffects } from "../src/flatten.js";
import { scoreboardAccesses, tagAccesses } from "../src/state-access.js";

const source = { artifactId: "art", relativePath: "functions/test.mcfunction" };

describe("command grammar", () => {
  it("parses modern execute run with selector filters and nested structure load", () => {
    const result = analyzeCommand(
      "execute as @a[tag=arena1,scores={stage=1..}] at @s run structure load demo:gate ~ ~ ~",
      source,
    );
    const flat = flattenCommandEffects(result);

    expect(flat.some((effect) => effect.kind === "structure-load")).toBe(true);
    expect(scoreboardAccesses(flat)).toEqual(expect.arrayContaining([
      expect.objectContaining({ objective: "stage", access: "read" }),
    ]));
    expect(tagAccesses(flat)).toEqual(expect.arrayContaining([
      expect.objectContaining({ tag: "arena1", access: "read" }),
    ]));
  });

  it("models scoreboard operation as target read-write plus source read", () => {
    const result = analyzeCommand(
      "scoreboard players operation @s score += @p other",
      source,
    );
    const accesses = scoreboardAccesses(result.effects);

    expect(accesses).toEqual(expect.arrayContaining([
      { objective: "score", access: "read", target: "@s" },
      { objective: "score", access: "write", target: "@s" },
      { objective: "other", access: "read", target: "@p" },
    ]));
  });

  it("recognizes direct function and structure references", () => {
    expect(analyzeCommand("function game/start", source).effects)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "function-call", target: "game/start" }),
      ]));

    expect(analyzeCommand("structure load arena:tier1 1 2 3", source).effects)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "structure-load", target: "arena:tier1" }),
      ]));
  });
});
