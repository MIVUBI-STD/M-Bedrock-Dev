import { describe, expect, it } from "vitest";
import { parseDialogueDocument } from "../src/parse.js";

const source = {
  artifactId: "fixture",
  relativePath: "dialogue/scene.json",
};

describe("NPC dialogue parser", () => {
  it("extracts scene commands and normalizes slash-prefixed commands", () => {
    const parsed = parseDialogueDocument({
      format_version: "1.20.80",
      "minecraft:npc_dialogue": {
        scenes: [{
          scene_tag: "entry",
          on_open_commands: ["/playsound mob.villager.haggle @initiator"],
          buttons: [{
            commands: ["/dialogue open @s @initiator directions"],
          }],
        }, {
          scene_tag: "directions",
          on_close_commands: ["say bye"],
        }],
      },
    }, source);

    expect(parsed?.scenes[0]?.commands).toEqual(expect.arrayContaining([
      expect.objectContaining({
        trigger: "open",
        raw: "playsound mob.villager.haggle @initiator",
      }),
      expect.objectContaining({
        trigger: "button",
        raw: "dialogue open @s @initiator directions",
      }),
    ]));
  });

  it("records duplicate scene tags explicitly", () => {
    const parsed = parseDialogueDocument({
      "minecraft:npc_dialogue": {
        scenes: [
          { scene_tag: "same" },
          { scene_tag: "same" },
        ],
      },
    }, source);

    expect(parsed?.duplicateSceneTags).toEqual(["same"]);
  });
});
