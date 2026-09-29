import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../analyzers/scripts/src/index.js";
import { analyzeArenaLifecycleConvergence } from "../src/arena-lifecycle-analysis.js";

describe("arena lifecycle convergence", () => {
  it("proves release and generation invalidation through a cleanup helper", () => {
    const script = parseScriptFile(
      "main",
      [
        "function endGame(arena, player) {",
        "  cleanupArena(arena, player);",
        "}",
        "function cleanupArena(arena, player) {",
        "  arena.players.delete(player);",
        "  arena.generation++;",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaLifecycleConvergence([script]);
    expect(result.assessments).toHaveLength(2);
    expect(
      result.assessments.find(
        (item) => item.terminalRegion === "function:endGame",
      ),
    ).toMatchObject({
      status: "proven",
      scopes: [{
        arenaExpression: "arena",
        membershipRelease: true,
        generationInvalidation: true,
        status: "proven",
      }],
    });
  });

  it("keeps release-only cleanup partial", () => {
    const script = parseScriptFile(
      "main",
      [
        "function cleanupArena(arena, player) {",
        "  arena.players.delete(player);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaLifecycleConvergence([script]);
    expect(result.assessments[0]?.status).toBe("partial");
  });
});
