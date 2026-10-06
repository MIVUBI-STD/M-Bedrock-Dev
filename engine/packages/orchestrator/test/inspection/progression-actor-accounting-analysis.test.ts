import {
  describe,
  expect,
  it,
} from "vitest";
import {
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeProgressionActorAccounting,
} from "../../src/inspection/progression-actor-accounting-analysis.js";

function parsed(text: string) {
  return {
    parsed: parseScriptFile(
      "main",
      text,
      {
        artifactId: "fixture",
        relativePath:
          "scripts/main.ts",
      },
    ),
    text,
  };
}

describe(
  "progression actor accounting analysis",
  () => {
    it("proves a progression counter cannot reach its zero completion gate when only growth exists", () => {
      const result =
        analyzeProgressionActorAccounting([
          parsed([
            "let remainingEnemies = 0;",
            "function spawnEnemy() { remainingEnemies += 1; }",
            "function maybeAdvance() {",
            "  if (remainingEnemies <= 0) nextWave();",
            "}",
          ].join("\n")),
        ]);

      expect(
        result.provenMissingReconciliation,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          counterId:
            "remainingEnemies",
          status:
            "missing-reconciliation",
          growthWrites: 1,
          decrementWrites: 0,
          completionChecks: 1,
        });
    });

    it("keeps a balanced decrement path from becoming a contradiction", () => {
      const result =
        analyzeProgressionActorAccounting([
          parsed([
            "let remainingEnemies = 0;",
            "function spawnEnemy() { remainingEnemies++; }",
            "function onEnemyDeath() { remainingEnemies--; }",
            "function maybeAdvance() {",
            "  if (remainingEnemies === 0) nextWave();",
            "}",
          ].join("\n")),
        ]);

      expect(
        result.provenMissingReconciliation,
      ).toBe(0);
      expect(result.balancedCounters)
        .toBe(1);
    });

    it("tracks scoreboard-backed wave accounting", () => {
      const result =
        analyzeProgressionActorAccounting([
          parsed([
            "player.runCommand('scoreboard players add @s wave_remaining 1');",
            "player.runCommand('execute if score @s wave_remaining matches 0 run function next_wave');",
          ].join("\n")),
        ]);

      expect(
        result.provenMissingReconciliation,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          counterId:
            "wave_remaining",
          kind: "scoreboard",
          status:
            "missing-reconciliation",
        });
    });
  },
);
