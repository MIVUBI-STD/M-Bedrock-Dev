import { describe, expect, it } from "vitest";
import {
  parseScriptFile,
} from "../src/index.js";

const source = {
  artifactId: "art-arena",
  relativePath: "scripts/arena.ts",
};

describe("arena authority evidence", () => {
  it("proves a capacity authority path only when capacity and membership commit share the same arena object and execution region", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function join(arena, player) {",
        "  const maxPlayers = arena.maxPlayers;",
        "  if (arena.members.size >= maxPlayers) return;",
        "  arena.members.add(player);",
        "}",
      ].join("\n"),
      source,
    );

    expect(parsed.arenaAuthorityPaths).toEqual([
      expect.objectContaining({
        arenaExpression: "arena",
        executionRegion: "function:join",
        capacityAuthorityProven: true,
        startAuthorityProven: false,
        membershipCommit: expect.objectContaining({
          kind: "membership-commit",
          membershipExpression: "arena.members",
          subjectExpression: "player",
        }),
        capacityOperand: expect.objectContaining({
          kind: "capacity-operand",
          capacityExpression: "maxPlayers",
        }),
        capacityCheck: expect.objectContaining({
          kind: "capacity-check",
          membershipExpression: "arena.members",
          capacityExpression: "maxPlayers",
        }),
      }),
    ]);
  });

  it("does not prove capacity ownership when a local limit belongs to a different arena object", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function join(arena, otherArena, player) {",
        "  const maxPlayers = otherArena.maxPlayers;",
        "  if (arena.members.size >= maxPlayers) return;",
        "  arena.members.add(player);",
        "}",
      ].join("\n"),
      source,
    );

    expect(
      parsed.arenaAuthorityPaths?.find(
        (path) =>
          path.arenaExpression === "arena",
      ),
    ).toMatchObject({
      capacityAuthorityProven: false,
    });
  });

  it("proves start ownership only when owner acquisition and start-state commit share the same arena path", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function start(arena) {",
        "  const arenaGeneration = arena.generation;",
        "  arena.startOwner = arenaGeneration;",
        '  arena.state = "countdown";',
        "}",
      ].join("\n"),
      source,
    );

    expect(
      parsed.arenaAuthorityPaths?.find(
        (path) =>
          path.arenaExpression === "arena",
      ),
    ).toMatchObject({
      startAuthorityProven: true,
      generationOperand: expect.objectContaining({
        kind: "arena-generation-operand",
        generationExpression: "arenaGeneration",
      }),
      startOwnerAcquire: expect.objectContaining({
        kind: "start-owner-acquire",
        ownerExpression: "arenaGeneration",
        generationExpression: "arenaGeneration",
      }),
      startStateCommit: expect.objectContaining({
        kind: "start-state-commit",
        stateExpression: "arena.state=countdown",
      }),
    });
  });

  it("does not merge start ownership across different arena objects", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function start(arena, otherArena) {",
        "  const arenaGeneration = arena.generation;",
        "  otherArena.startOwner = arenaGeneration;",
        '  arena.state = "countdown";',
        "}",
      ].join("\n"),
      source,
    );

    expect(
      parsed.arenaAuthorityPaths?.find(
        (path) =>
          path.arenaExpression === "arena",
      ),
    ).toMatchObject({
      startAuthorityProven: false,
    });
  });

  it("keeps join-pad or queue-like arrays outside arena authority unless the authored property is an explicit membership surface", () => {
    const parsed = parseScriptFile(
      "arena",
      [
        "function join(arena, player) {",
        "  arena.queue.push(player);",
        "}",
      ].join("\n"),
      source,
    );

    expect(parsed.arenaAuthorityEvidence).toEqual([]);
    expect(parsed.arenaAuthorityPaths).toEqual([]);
  });
});
