import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import { analyzeWorldRuleAuthority } from "../../src/inspection/world-rule-authority-analysis.js";

describe("world rule authority analysis", () => {
  it("separates natural mob spawning from manual/script spawn paths", () => {
    const script = parseScriptFile(
      "main",
      [
        "function setup(player, dimension) {",
        "  player.runCommand('gamerule doMobSpawning false');",
        "  dimension.spawnEntity('minecraft:zombie', { x: 0, y: 0, z: 0 });",
        "  player.runCommand('summon minecraft:skeleton 0 0 0');",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeWorldRuleAuthority([script]);

    expect(result.naturalMobSpawning).toBe("disabled");
    expect(result.manualEntitySpawnPaths).toBe(2);
    expect(result.conflicts).toEqual([]);
  });

  it("keeps conflicting gamerule writers unresolved", () => {
    const script = parseScriptFile(
      "main",
      [
        "function setup(player) { player.runCommand('gamerule doMobSpawning false'); }",
        "function debug(player) { player.runCommand('gamerule doMobSpawning true'); }",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeWorldRuleAuthority([script]);

    expect(result.naturalMobSpawning).toBe("conflicted");
    expect(result.conflicts[0]?.rule).toBe("domobspawning");
  });
  it("detects direct GameRules property assignments", () => {
    const text = [
      "function setup(world) {",
      "  const rules = world.getGameRules();",
      "  rules.doMobSpawning = false;",
      "}",
    ].join("\n");
    const script = parseScriptFile(
      "main",
      text,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeWorldRuleAuthority([
      { parsed: script, text },
    ]);

    expect(result.naturalMobSpawning).toBe("disabled");
    expect(result.writes.some(
      (item) => item.rule.toLowerCase() === "domobspawning",
    )).toBe(true);
  });
  it("detects data-driven gamerule object values and stored summon commands", () => {
    const text = [
      "const WorldData = {",
      "  gamerule: { doMobSpawning: false, pvp: false },",
      "  summon: ['/summon minecraft:zombie 0 0 0'],",
      "};",
      "function apply(world) {",
      "  for (const [rule, value] of Object.entries(WorldData.gamerule)) {",
      "    world.gameRules[rule] = value;",
      "  }",
      "}",
    ].join("\n");
    const script = parseScriptFile(
      "main",
      text,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result = analyzeWorldRuleAuthority([
      { parsed: script, text },
    ]);

    expect(result.naturalMobSpawning).toBe("disabled");
    expect(result.commandSummonPaths).toBeGreaterThan(0);
  });
});
