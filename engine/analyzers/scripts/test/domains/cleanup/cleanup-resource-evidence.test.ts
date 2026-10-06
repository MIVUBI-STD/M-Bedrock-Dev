import { describe, expect, it } from "vitest";
import { deriveScriptCleanupResourceEvidence } from "../../../src/domains/cleanup/cleanup-resource-evidence.js";

const source = {
  artifactId: "fixture",
  relativePath: "scripts/main.ts",
};

describe("script cleanup resource evidence", () => {
  it("extracts exact tag effect scoreboard and timer inverse keys", () => {
    const result =
      deriveScriptCleanupResourceEvidence(
        [
          "function start(player, objective, system) {",
          "  player.addTag('playing');",
          "  player.addEffect('speed', 20);",
          "  objective.setScore(player, 1);",
          "  const timer = system.runTimeout(() => {}, 20);",
          "}",
          "function cleanup(player, objective, system, timer) {",
          "  player.removeTag('playing');",
          "  player.removeEffect('speed');",
          "  objective.removeParticipant(player);",
          "  system.clearRun(timer);",
          "}",
        ].join("\n"),
        source,
      );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "tag",
          action: "acquire",
          key: "player:playing",
          precision: "exact",
        }),
        expect.objectContaining({
          surface: "tag",
          action: "release",
          key: "player:playing",
          precision: "exact",
        }),
        expect.objectContaining({
          surface: "scoreboard",
          action: "release",
          key: "objective:player",
          precision: "exact",
        }),
        expect.objectContaining({
          surface: "deferred-callback",
          action: "acquire",
          key: "handle:timer",
          precision: "exact",
        }),
      ]),
    );
  });

  it("tracks exact rider relationship acquire and release", () => {
    const result = deriveScriptCleanupResourceEvidence(
      [
        "function start(rideable, player) { rideable.addRider(player); }",
        "function cleanup(rideable, player) { rideable.removeRider(player); }",
      ].join("\n"),
      source,
    );
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ surface: "mount-relationship", action: "acquire", key: "rideable:player" }),
      expect.objectContaining({ surface: "mount-relationship", action: "release", key: "rideable:player" }),
    ]));
  });

  it("treats literal permission restoration as release evidence", () => {
    const result =
      deriveScriptCleanupResourceEvidence(
        [
          "function start(player) {",
          "  player.inputPermissions.movementEnabled = false;",
          "}",
          "function cleanup(player) {",
          "  player.inputPermissions.movementEnabled = true;",
          "}",
        ].join("\n"),
        source,
      );

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "input-permission",
          action: "acquire",
          precision: "exact",
        }),
        expect.objectContaining({
          surface: "input-permission",
          action: "release",
          precision: "exact",
        }),
      ]),
    );
  });
});
