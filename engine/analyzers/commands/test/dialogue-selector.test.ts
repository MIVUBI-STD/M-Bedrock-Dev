import { describe, expect, it } from "vitest";
import { analyzeCommand } from "../src/parse.js";
import { parseSelector } from "../src/selectors.js";

const source = {
  artifactId: "fixture",
  relativePath: "functions/dialogue.mcfunction",
};

describe("NPC dialogue command semantics", () => {
  it("recognizes @initiator as a selector", () => {
    expect(parseSelector("@initiator")).toMatchObject({
      base: "@initiator",
      raw: "@initiator",
    });
  });

  it("parses dialogue open", () => {
    const result = analyzeCommand(
      "dialogue open @e[type=npc,tag=guide] @p intro",
      source,
    );
    expect(result.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "dialogue",
        operation: "open",
        npcTarget: "@e[type=npc,tag=guide]",
        playerTarget: "@p",
        sceneName: "intro",
      }),
    ]));
  });

  it("parses dialogue change with per-player target", () => {
    const result = analyzeCommand(
      "dialogue change @e[tag=guide] quest_done @initiator",
      source,
    );
    expect(result.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: "dialogue",
        operation: "change",
        sceneName: "quest_done",
        playerTarget: "@initiator",
      }),
      expect.objectContaining({
        kind: "selector-read",
        selector: expect.objectContaining({ base: "@initiator" }),
      }),
    ]));
  });
});
