import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeArenaCleanupSurfaces } from "../../src/arena/arena-cleanup-surface-analysis.js";

describe("arena cleanup surface analysis", () => {
  it("proves exact dynamic-property and membership cleanup reachable from terminal", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  player.setDynamicProperty('arena:ready', true);",
        "}",
        "function endGame(arena, player) {",
        "  cleanupArena(arena, player);",
        "}",
        "function cleanupArena(arena, player) {",
        "  arena.players.delete(player);",
        "  player.setDynamicProperty('arena:ready', undefined);",
        "  arena.generation++;",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaCleanupSurfaces([script]);
    const terminal = result.terminalAssessments.find(
      (item) => item.terminalRegion === "function:endGame",
    );
    expect(
      terminal?.surfaces.find(
        (item) => item.surface === "membership",
      )?.status,
    ).toBe("proven");
    expect(result.ledger?.resources).toBeGreaterThan(0);
    expect(
      result.ledger?.obligations.find(
        (item) => item.surface === "membership",
      )?.status,
    ).toBe("complete");
  });

  it("keeps surface-level API inverse as partial rather than exact proof", () => {
    const script = parseScriptFile(
      "main",
      [
        "function start(player) { player.addTag('playing'); }",
        "function cleanup(player) { player.removeTag('playing'); }",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaCleanupSurfaces([script]);
    expect(
      result.terminalAssessments[0]?.surfaces.find(
        (item) => item.surface === "tag",
      )?.status,
    ).toBe("partial");
    expect(
      result.ledger?.obligations.find(
        (item) => item.surface === "tag",
      )?.status,
    ).toBe("partial");
  });

  it("marks resources without any terminal cleanup path as missing", () => {
    const script = parseScriptFile(
      "main",
      [
        "function start(player) {",
        "  player.addTag('playing');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaCleanupSurfaces([script]);
    expect(result.ledger).toMatchObject({
      resources: 1,
      complete: 0,
      partial: 0,
      missing: 1,
      coverageRatio: 0,
    });
  });
});
