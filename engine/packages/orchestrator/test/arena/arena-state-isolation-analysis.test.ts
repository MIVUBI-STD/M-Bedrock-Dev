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
        sourceRefs: [{ artifactId: "fixture", relativePath: "scripts/main.ts" }],
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

  it("requires partition proof for generic player tags mutated from arena flow", () => {
    const script = {
      identifier: "arena-gameplay",
      arenaAuthorityPaths: [{
        executionRegion: "function:runArena",
        arenaExpression: "arenaId",
      }],
      localFunctionCalls: [],
      dynamicProperties: [],
      propertyWrites: [],
      commandLiterals: [],
      stateMutations: [],
      methodCalls: [{
        executionRegion: "function:runArena",
        receiverType: "Player",
        receiver: "player",
        method: "removeTag",
        symbol: "player.removeTag",
        argumentTexts: ['"flag_carrier"'],
      }],
    } as any;

    const result =
      analyzeArenaStateIsolation([script]);

    expect(
      result.observations.some(
        (item) =>
          item.surface === "entity-tag" &&
          item.status === "partition-proof-required",
      ),
    ).toBe(true);
  });

  it("accepts arena-keyed player tags as isolated", () => {
    const script = {
      identifier: "arena-gameplay",
      arenaAuthorityPaths: [{
        executionRegion: "function:runArena",
        arenaExpression: "arenaId",
      }],
      localFunctionCalls: [],
      dynamicProperties: [],
      propertyWrites: [],
      commandLiterals: [],
      stateMutations: [],
      methodCalls: [{
        executionRegion: "function:runArena",
        receiverType: "Player",
        receiver: "player",
        method: "addTag",
        symbol: "player.addTag",
        argumentTexts: ['"flag_carrier:" + arenaId'],
      }],
    } as any;

    const result =
      analyzeArenaStateIsolation([script]);

    expect(
      result.observations.some(
        (item) =>
          item.surface === "entity-tag" &&
          item.status === "isolated",
      ),
    ).toBe(true);
  });

  it("does not borrow arena authority from another execution region", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.members.add(player);",
        "  world.setDynamicProperty('arena:' + arena.id, 1);",
        "}",
        "function other(otherArena, arena, player) {",
        "  otherArena.members.add(player);",
        "  world.setDynamicProperty('arena:' + arena.id, 1);",
        "}",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const observations = analyzeArenaStateIsolation([script]).observations
      .filter((item) => item.surface === "dynamic-property");
    expect(observations.find((item) => item.region === "function:join"))
      .toMatchObject({ status: "isolated", scope: "arena-local" });
    expect(observations.find((item) => item.region === "function:other"))
      .toMatchObject({ status: "partition-proof-required", scope: "world-global" });
  });

  it("does not infer module-state isolation from arena-like variable names", () => {
    const script = {
      identifier: "main",
      arenaAuthorityPaths: [{ arenaExpression: "arena", executionRegion: "function:join" }],
      localFunctionCalls: [],
      dynamicProperties: [],
      propertyWrites: [],
      commandLiterals: [],
      methodCalls: [],
      stateMutations: [
        { executionRegion: "function:join", target: "arenaCounter" },
        { executionRegion: "function:join", target: "playerSessions" },
        { executionRegion: "function:join", target: "arena.state" },
      ],
    } as any;
    const observations = analyzeArenaStateIsolation([script]).observations
      .filter((item) => item.surface === "module-state");
    expect(observations.find((item) => item.key === "arenaCounter")?.status)
      .toBe("partition-proof-required");
    expect(observations.find((item) => item.key === "playerSessions")?.status)
      .toBe("partition-proof-required");
    expect(observations.find((item) => item.key === "arena.state")?.status)
      .toBe("isolated");
  });

  it("does not claim player isolation from lexical identifiers", () => {
    const script = {
      identifier: "main",
      arenaAuthorityPaths: [{ arenaExpression: "arena", executionRegion: "function:join" }],
      localFunctionCalls: [],
      propertyWrites: [],
      commandLiterals: [],
      stateMutations: [],
      dynamicProperties: [{
        operation: "set",
        executionRegion: "function:join",
        receiverHint: "world",
        propertyExpression: "'playerShared'",
      }],
      methodCalls: [{
        executionRegion: "function:join",
        receiverType: "ScoreboardObjective",
        method: "setScore",
        symbol: "objective.setScore",
        argumentTexts: ["memberCounter", "1"],
      }],
    } as any;

    const observations = analyzeArenaStateIsolation([script]).observations;
    expect(observations.find((item) => item.surface === "dynamic-property"))
      .toMatchObject({ status: "partition-proof-required", scope: "world-global" });
    expect(observations.find((item) => item.surface === "scoreboard"))
      .toMatchObject({ status: "partition-proof-required", scope: "world-global" });
  });

  it("does not apply scoreboard authority contracts via substring collisions", () => {
    const script = {
      identifier: "main",
      arenaAuthorityPaths: [{ arenaExpression: "arena", executionRegion: "function:join" }],
      localFunctionCalls: [],
      dynamicProperties: [],
      propertyWrites: [],
      commandLiterals: [],
      stateMutations: [],
      methodCalls: [{
        executionRegion: "function:join",
        receiverType: "ScoreboardObjective",
        method: "setScore",
        symbol: "objective.setScore",
        argumentTexts: ["teamKills", "1"],
      }],
    } as any;
    const contracts = [{
      id: "short-scoreboard-key",
      authority: { kind: "scoreboard", key: "Kills" },
      mirrors: [],
      scope: "arena",
    }] as any;
    const result = analyzeArenaStateIsolation([script], contracts);
    expect(result.observations.find((item) => item.surface === "scoreboard"))
      .toMatchObject({
        status: "partition-proof-required",
        scope: "world-global",
      });
  });


  it("does not claim isolation when matching authority contracts disagree on scope", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeArenaStateIsolation([script], [
      { id: "contract-arena", authority: { kind: "dynamic-property", key: "arenaState" }, mirrors: [], scope: "arena" },
      { id: "contract-player", authority: { kind: "dynamic-property", key: "arenaState" }, mirrors: [], scope: "player" },
    ]);
    expect(result.observations.find((item) => item.surface === "dynamic-property"))
      .toMatchObject({
        scope: "unknown",
        status: "partition-proof-required",
        authorityContractIds: ["contract-arena", "contract-player"],
      });
  });

  it("does not promote provenance-free state contracts to isolated", () => {
    const script = parseScriptFile(
      "main",
      [
        "function join(arena, player) {",
        "  arena.players.add(player);",
        "  world.setDynamicProperty('arenaState', 1);",
        "}",
      ].join("\n"),
      { artifactId: "fixture", relativePath: "scripts/main.ts" },
    );
    const result = analyzeArenaStateIsolation([script], [{
      id: "unproven-arena-contract",
      authority: { kind: "dynamic-property", key: "arenaState" },
      mirrors: [],
      scope: "arena",
    }]);
    expect(result.observations.find((item) => item.surface === "dynamic-property"))
      .toMatchObject({
        status: "partition-proof-required",
        scope: "unknown",
        authorityContractIds: ["unproven-arena-contract"],
      });
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
