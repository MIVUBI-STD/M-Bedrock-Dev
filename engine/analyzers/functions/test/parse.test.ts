import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../src/parse.js";

describe("parseMcFunction", () => {
  const source = { artifactId: "art_demo", relativePath: "functions/game/start.mcfunction" };

  it("extracts function, structure, scoreboard and tag references", () => {
    const parsed = parseMcFunction(
      "game/start",
      [
        "# comment",
        "function game/reset",
        "structure load arena:tier1 0 0 0",
        "scoreboard players add @p game_state 1",
        "execute as @a[scores={wave=1..}] run say hi",
        "tag @p add active",
      ].join("\n"),
      source,
    );

    expect(parsed.references.map((ref) => ref.kind)).toEqual([
      "function",
      "structure",
      "scoreboard-write",
      "scoreboard-read",
      "tag-write",
    ]);
    expect(parsed.references[0]?.source.range?.lineStart).toBe(2);
  });
});
