import { describe, expect, it } from "vitest";
import { parseMcFunction } from "../../../../analyzers/functions/src/index.js";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeArenaGlobalState } from "../../src/arena/arena-global-state-analysis.js";

describe("arena global state analysis", () => {
  it("recognizes paired lease evidence for arena-scoped gamerule mutation", () => {
    const script = parseScriptFile(
      "main",
      [
        "function start(arena) {",
        "  arena.players.add(player);",
        "  acquireGlobalLease('gamerule:pvp', arena);",
        "  dimension.runCommand('gamerule pvp false');",
        "  auditGlobalLease('gamerule:pvp');",
        "}",
        "function cleanup(arena) {",
        "  releaseGlobalLease('gamerule:pvp', arena);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaGlobalState(
        [],
        [script],
      );

    expect(result.arenaScopedMutations)
      .toBe(1);
    expect(result.pairedLeaseEvidence)
      .toBe(1);
    expect(result.unauditedArenaMutations)
      .toBe(0);
  });

  it("proves an arena-scoped gamerule mutation is unleased when no global ownership path exists", () => {
    const script = parseScriptFile(
      "main",
      [
        "function start(arena) {",
        "  arena.players.add(player);",
        "  dimension.runCommand('gamerule pvp false');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeArenaGlobalState(
        [],
        [script],
      );

    expect(result.arenaScopedMutations)
      .toBe(1);
    expect(result.unleasedArenaMutations)
      .toBe(1);
    expect(result.assessments[0]?.status)
      .toBe("unleased");
  });

  it("keeps mcfunction global mutation unscoped without invented arena ownership", () => {
    const fn = parseMcFunction(
      "setup",
      "gamerule pvp false",
      {
        artifactId: "fixture",
        relativePath:
          "functions/setup.mcfunction",
      },
    );

    const result =
      analyzeArenaGlobalState(
        [fn],
        [],
      );

    expect(result.unscopedMutations)
      .toBe(1);
    expect(result.unleasedArenaMutations)
      .toBe(0);
  });
});
