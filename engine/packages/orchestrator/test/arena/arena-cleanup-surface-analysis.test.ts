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
  it("tracks equipment and temporary player capabilities as cleanup obligations", () => {
    const script = parseScriptFile(
      "main",
      [
        "function start(player, equipment) {",
        "  equipment.setEquipment('Chest', new ItemStack('minecraft:elytra'));",
        "  player.runCommand('ability @s mayfly true');",
        "}",
        "function endGame(player, equipment) {",
        "  equipment.setEquipment('Chest', undefined);",
        "  player.runCommand('ability @s mayfly false');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaCleanupSurfaces([script]);
    const surfaces = result.ledger?.obligations ?? [];

    expect(
      surfaces.some(
        (item) =>
          item.surface === "equipment" &&
          item.status !== "missing",
      ),
    ).toBe(true);
    expect(
      surfaces.some(
        (item) =>
          item.surface === "player-capability" &&
          item.key.includes("mayfly") &&
          item.status === "complete",
      ),
    ).toBe(true);
  });

  it("accepts a complete authored cleanup transaction lifecycle", () => {
    const script = parseScriptFile(
      "main",
      [
        "type CleanupState = 'FREEZE' | 'INVALIDATE' | 'CLEAN' | 'RESTORE_BASELINE' | 'VERIFY_EMPTY' | 'READY_FOR_NEXT_GENERATION';",
        "const cleanupTransitions: Record<CleanupState, readonly CleanupState[]> = {",
        "  FREEZE: ['INVALIDATE'],",
        "  INVALIDATE: ['CLEAN'],",
        "  CLEAN: ['RESTORE_BASELINE'],",
        "  RESTORE_BASELINE: ['VERIFY_EMPTY'],",
        "  VERIFY_EMPTY: ['READY_FOR_NEXT_GENERATION'],",
        "  READY_FOR_NEXT_GENERATION: [],",
        "};",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaCleanupSurfaces([
        script,
      ]);

    expect(
      result.lifecycle,
    ).toMatchObject({
      declared: true,
      complete: 1,
      unresolved: 0,
    });
  });

  it("keeps a cleanup lifecycle unresolved when verify-empty is skipped", () => {
    const script = parseScriptFile(
      "main",
      [
        "type ResetState = 'FREEZE' | 'INVALIDATE' | 'CLEAN' | 'RESTORE_BASELINE' | 'READY_FOR_NEXT_GENERATION';",
        "const resetTransitions: Record<ResetState, readonly ResetState[]> = {",
        "  FREEZE: ['INVALIDATE'],",
        "  INVALIDATE: ['CLEAN'],",
        "  CLEAN: ['RESTORE_BASELINE'],",
        "  RESTORE_BASELINE: ['READY_FOR_NEXT_GENERATION'],",
        "  READY_FOR_NEXT_GENERATION: [],",
        "};",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaCleanupSurfaces([
        script,
      ]);

    expect(
      result.lifecycle.unresolved,
    ).toBe(1);
    expect(
      result.lifecycle
        .assessments[0]
        ?.missingPhases,
    ).toContain("verifyempty");
  });

  it("requires an explicit cleanup lifecycle when mutable arena surfaces are acquired", () => {
    const script = parseScriptFile(
      "main",
      [
        "function start(player) {",
        "  player.addTag('playing');",
        "}",
        "function cleanup(player) {",
        "  player.removeTag('playing');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaCleanupSurfaces([
        script,
      ]);

    expect(
      result.lifecycle,
    ).toMatchObject({
      declared: false,
      complete: 0,
      unresolved: 1,
    });
  });

  it("flags temporary equipment without cleanup as missing", () => {
    const script = parseScriptFile(
      "main",
      [
        "function start(equipment) {",
        "  equipment.setEquipment('Chest', new ItemStack('minecraft:elytra'));",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaCleanupSurfaces([script]);

    expect(
      result.ledger?.obligations.find(
        (item) => item.surface === "equipment",
      )?.status,
    ).toBe("missing");
  });
});
