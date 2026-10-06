import { describe, expect, it } from "vitest";
import {
  deriveCrossFileCallEdges,
  deriveScriptTerminalIdempotencyEvidence,
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

  it("proves an unguarded deferred terminal path can race another exact ingress", () => {
    const source = [
      "function endGame(arena, player) {",
      "  arena.players.delete(player);",
      "  arena.generation++;",
      "}",
      "world.afterEvents.entityDie.subscribe(() => {",
      "  endGame(arena, player);",
      "});",
      "system.runTimeout(() => {",
      "  endGame(arena, player);",
      "}, 20);",
    ].join("\n");
    const script = parseScriptFile(
      "main",
      source,
      {
        artifactId: "fixture",
        relativePath:
          "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaLifecycleConvergence(
        [script],
      );

    expect(
      result.provenTerminalRaces,
    ).toBe(1);
    expect(
      result.terminalRaces.find(
        (item) =>
          item.terminalRegion ===
            "function:endGame",
      ),
    ).toMatchObject({
      status: "contradicted",
      ingresses: expect.arrayContaining([
        expect.objectContaining({
          kind: "event",
          id:
            "world.afterEvents.entityDie",
        }),
        expect.objectContaining({
          kind: "deferred",
          guardStatus:
            "unguarded",
        }),
      ]),
    });
  });

  it("closes a deferred terminal race when the terminal owner has a one-shot latch", () => {
    const source = [
      "let ended = false;",
      "function endGame(arena, player) {",
      "  if (ended) return;",
      "  ended = true;",
      "  arena.players.delete(player);",
      "  arena.generation++;",
      "}",
      "world.afterEvents.entityDie.subscribe(() => {",
      "  endGame(arena, player);",
      "});",
      "system.runTimeout(() => {",
      "  endGame(arena, player);",
      "}, 20);",
    ].join("\n");
    const script = parseScriptFile(
      "main",
      source,
      {
        artifactId: "fixture",
        relativePath:
          "scripts/main.ts",
      },
    );
    const latch =
      deriveScriptTerminalIdempotencyEvidence(
        source,
        script.source,
      );

    const result =
      analyzeArenaLifecycleConvergence(
        [script],
        [],
        latch,
      );

    expect(
      result.protectedTerminalRaces,
    ).toBe(1);
    expect(
      result.provenTerminalRaces,
    ).toBe(0);
    expect(
      result.terminalRaces.find(
        (item) =>
          item.terminalRegion ===
            "function:endGame",
      ),
    ).toMatchObject({
      status: "protected",
      idempotencyKind:
        "boolean-latch",
    });
  });

  it("keeps different event terminal ingresses unresolved without coexistence proof", () => {
    const source = [
      "function endGame(arena, player) {",
      "  arena.players.delete(player);",
      "  arena.generation++;",
      "}",
      "world.afterEvents.entityDie.subscribe(() => {",
      "  endGame(arena, player);",
      "});",
      "world.afterEvents.playerLeave.subscribe(() => {",
      "  endGame(arena, player);",
      "});",
    ].join("\n");
    const script = parseScriptFile(
      "main",
      source,
      {
        artifactId: "fixture",
        relativePath:
          "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaLifecycleConvergence(
        [script],
      );

    expect(
      result.unresolvedTerminalRaces,
    ).toBe(1);
    expect(
      result.provenTerminalRaces,
    ).toBe(0);
    expect(
      result.terminalRaces.find(
        (item) =>
          item.terminalRegion ===
            "function:endGame",
      )?.status,
    ).toBe("unresolved");
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


  it("keeps an unguarded deferred gameplay mutation visible as unresolved ownership", () => {
    const source = [
      "let remainingEnemies = 0;",
      "system.runTimeout(() => {",
      "  remainingEnemies++;",
      "}, 20);",
    ].join("\n");
    const script = parseScriptFile(
      "main",
      source,
      {
        artifactId: "fixture",
        relativePath:
          "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaLifecycleConvergence(
        [script],
      );

    expect(
      result.unresolvedDeferredMutations,
    ).toBe(1);
    expect(
      result.deferredMutations[0],
    ).toMatchObject({
      scheduler: "runTimeout",
      status: "unresolved",
    });
  });

  it("closes deferred mutation ownership when a generation comparison is explicit", () => {
    const source = [
      "let remainingEnemies = 0;",
      "let arenaGeneration = 3;",
      "const capturedGeneration = arenaGeneration;",
      "system.runTimeout(() => {",
      "  if (capturedGeneration !== arenaGeneration) return;",
      "  remainingEnemies++;",
      "}, 20);",
    ].join("\n");
    const script = parseScriptFile(
      "main",
      source,
      {
        artifactId: "fixture",
        relativePath:
          "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaLifecycleConvergence(
        [script],
      );

    expect(
      result.protectedDeferredMutations,
    ).toBe(1);
    expect(
      result.unresolvedDeferredMutations,
    ).toBe(0);
    expect(
      result.deferredMutations[0],
    ).toMatchObject({
      status: "protected",
    });
  });

  it("accepts explicit connection-session generation revalidation before deferred mutation", () => {
    const source = [
      "let score = 0;",
      "let sessionId = 7;",
      "const capturedSessionId = sessionId;",
      "system.run(() => {",
      "  if (capturedSessionId !== sessionId) return;",
      "  score++;",
      "});",
    ].join("\n");
    const script = parseScriptFile(
      "main",
      source,
      {
        artifactId: "fixture",
        relativePath:
          "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaLifecycleConvergence(
        [script],
      );

    expect(
      result.protectedDeferredMutations,
    ).toBe(1);
    expect(
      result.deferredMutations[0]
        ?.guardIdentifiers,
    ).toEqual(
      expect.arrayContaining([
        "capturedSessionId",
        "sessionId",
      ]),
    );
  });

  it("accepts explicit countdown generation revalidation before delayed start mutation", () => {
    const source = [
      "let started = false;",
      "let countdownGeneration = 4;",
      "const capturedGeneration = countdownGeneration;",
      "system.runTimeout(() => {",
      "  if (capturedGeneration !== countdownGeneration) return;",
      "  started = true;",
      "}, 20);",
    ].join("\n");
    const script = parseScriptFile(
      "main",
      source,
      {
        artifactId: "fixture",
        relativePath:
          "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaLifecycleConvergence(
        [script],
      );

    expect(
      result.protectedDeferredMutations,
    ).toBe(1);
    expect(
      result.unresolvedDeferredMutations,
    ).toBe(0);
  });
});
