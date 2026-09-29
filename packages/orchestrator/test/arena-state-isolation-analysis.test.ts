import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../analyzers/scripts/src/index.js";
import { analyzeArenaStateIsolation } from "../src/arena-state-isolation-analysis.js";

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
