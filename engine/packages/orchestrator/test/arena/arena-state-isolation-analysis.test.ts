import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeArenaStateIsolation } from "../../src/arena/arena-state-isolation-analysis.js";

describe("arena state isolation analysis", () => {
  it("marks world dynamic properties as requiring partition proof inside arena flow", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) => item.surface === "dynamic-property",
      ),
    ).toMatchObject({
      scope: "world-global",
      status: "partition-proof-required",
    });
  });

  it("proves arena-keyed dynamic properties and scoreboard participants automatically", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player, objective: ScoreboardObjective) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arena:' + arena.id, 1);",
        "  objective.setScore(arena.id, 1);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaStateIsolation(
        [script],
      );

    expect(
      result.observations.filter(
        (item) =>
          item.surface === "dynamic-property" ||
          item.surface === "scoreboard",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          surface: "dynamic-property",
          scope: "arena-local",
          status: "isolated",
        }),
        expect.objectContaining({
          surface: "scoreboard",
          scope: "arena-local",
          status: "isolated",
        }),
      ]),
    );
  });

  it("does not treat an arena-like literal key as authority partitioning", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaStateIsolation(
        [script],
      );

    expect(
      result.observations.find(
        (item) =>
          item.surface ===
          "dynamic-property",
      ),
    ).toMatchObject({
      scope: "world-global",
      status:
        "partition-proof-required",
    });
  });

  it("uses authored state authority contracts to prove arena partitioning", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation(
      [script],
      [{
        id: "arena-state",
        authority: {
          kind: "dynamic-property",
          key: "arenaState",
        },
        mirrors: [],
        scope: "arena",
      }],
    );

    expect(
      result.observations.find(
        (item) =>
          item.surface === "dynamic-property",
      ),
    ).toMatchObject({
      scope: "arena-local",
      status: "isolated",
      authorityContractIds: ["arena-state"],
    });
  });

  it("keeps arena-owned state isolated", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  arena.state = 'waiting';",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) => item.surface === "module-state",
      )?.status,
    ).toBe("isolated");
  });
});


  it("requires arena partition proof for global-selector mutations in arena flow", () => {
    const script = parseScriptFile(
      "main",
      [
        "function maintain(arena) {",
        "  arena.players.size;",
        "  world.getDimension('overworld').runCommandAsync('execute as @a at @s run fill ~1 ~0 ~1 ~-1 ~0 ~-1 grass_path replace dirt');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) =>
          item.surface === "world-command" &&
          item.key.includes("execute as @a"),
      ),
    ).toMatchObject({
      scope: "world-global",
      status: "partition-proof-required",
    });
  });

  it("requires partition proof for literal ticking-area names used by arena flow", () => {
    const script = parseScriptFile(
      "main",
      [
        "function startArena(arena) {",
        "  arena.players.size;",
        "  world.getDimension('overworld').runCommandAsync('tickingarea add circle ~ ~ ~ 4 shared_cinematic true');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) =>
          item.surface === "world-command" &&
          item.key.includes("tickingarea add"),
      ),
    ).toMatchObject({
      scope: "world-global",
      status: "partition-proof-required",
    });
  });


  it("flags world-wide player enumeration inside arena flow until partitioning is proven", () => {
    const script = parseScriptFile(
      "main",
      [
        "function cleanup(arena) {",
        "  arena.players.size;",
        "  for (const player of world.getAllPlayers()) {",
        "    player.removeTag('shared_carrier');",
        "  }",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) =>
          item.surface ===
          "world-player-enumeration",
      ),
    ).toMatchObject({
      scope: "world-global",
      status: "partition-proof-required",
    });
  });

  it("accepts arena-keyed world player queries as isolated", () => {
    const script = parseScriptFile(
      "main",
      [
        "function cleanup(arena) {",
        "  arena.players.size;",
        "  const players = world.getPlayers({ tags: ['arena_' + arena.id] });",
        "  for (const player of players) player.removeTag('carrier');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeArenaStateIsolation([script]);
    expect(
      result.observations.find(
        (item) =>
          item.surface ===
          "world-player-enumeration",
      ),
    ).toMatchObject({
      scope: "arena-local",
      status: "isolated",
    });
  });
