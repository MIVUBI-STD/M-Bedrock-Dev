import { describe, expect, it } from "vitest";
import {
  deriveCrossFileCallEdges,
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import { analyzeArenaLifecycleConvergence } from "../../src/arena/arena-lifecycle-analysis.js";

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

  it("keeps multiple independent terminal ingresses visible for collision proof", () => {
    const script = parseScriptFile(
      "main",
      [
        "function onFlagCaptured(arena, player) {",
        "  endGame(arena, player);",
        "}",
        "function onTimeExpired(arena, player) {",
        "  endGame(arena, player);",
        "}",
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

    const result =
      analyzeArenaLifecycleConvergence(
        [script],
      );

    expect(
      result.multiIngressTerminalTargets,
    ).toBe(1);
    expect(
      result.terminalIngresses.find(
        (item) =>
          item.terminalRegion ===
            "function:endGame",
      ),
    ).toMatchObject({
      distinctIngresses: 2,
      status: "multi-ingress",
      incomingCallerRegions: [
        "function:onFlagCaptured",
        "function:onTimeExpired",
      ],
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

  it("proves lifecycle convergence across imported cleanup modules", () => {
    const mainText = [
      'import { cleanupArena } from "../cleanup.js";',
      "function finishGame(arena, player) {",
      "  cleanupArena(arena, player);",
      "}",
    ].join("\n");
    const cleanupText = [
      "export function cleanupArena(arena, player) {",
      "  arena.players.delete(player);",
      "  arena.generation++;",
      "}",
    ].join("\n");

    const main = parseScriptFile(
      "main",
      mainText,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );
    const cleanup = parseScriptFile(
      "cleanup",
      cleanupText,
      {
        artifactId: "fixture",
        relativePath: "scripts/cleanup.ts",
      },
    );

    const crossFileCalls =
      deriveCrossFileCallEdges([
        {
          path: "scripts/main.ts",
          text: mainText,
          source: main.source,
        },
        {
          path: "scripts/cleanup.ts",
          text: cleanupText,
          source: cleanup.source,
        },
      ]);

    const result =
      analyzeArenaLifecycleConvergence(
        [main, cleanup],
        crossFileCalls,
      );

    expect(result.crossFileCalls).toBe(1);
    expect(
      result.assessments.find((item) =>
        item.terminalRegion ===
        "module:scripts/main.ts#function:finishGame"
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

  it("does not promote conditional cross-file cleanup to proven", () => {
    const mainText = [
      'import { cleanupArena } from "../cleanup.js";',
      "function finishGame(arena, player, shouldCleanup) {",
      "  if (shouldCleanup) {",
      "    cleanupArena(arena, player);",
      "  }",
      "}",
    ].join("\n");
    const cleanupText = [
      "export function cleanupArena(arena, player) {",
      "  arena.players.delete(player);",
      "  arena.generation++;",
      "}",
    ].join("\n");

    const main = parseScriptFile(
      "main",
      mainText,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );
    const cleanup = parseScriptFile(
      "cleanup",
      cleanupText,
      {
        artifactId: "fixture",
        relativePath: "scripts/cleanup.ts",
      },
    );

    const calls = deriveCrossFileCallEdges([
      {
        path: "scripts/main.ts",
        text: mainText,
        source: main.source,
      },
      {
        path: "scripts/cleanup.ts",
        text: cleanupText,
        source: cleanup.source,
      },
    ]);

    const result =
      analyzeArenaLifecycleConvergence(
        [main, cleanup],
        calls,
      );

    expect(
      result.assessments.find((item) =>
        item.terminalRegion ===
        "module:scripts/main.ts#function:finishGame"
      )?.status,
    ).toBe("partial");
  });

});
