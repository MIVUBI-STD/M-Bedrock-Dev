import {
  describe,
  expect,
  it,
} from "vitest";
import {
  deriveCrossFileCallEdges,
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeProgressionActorAccounting,
} from "../../src/inspection/progression-actor-accounting-analysis.js";

function parsed(
  text: string,
  path = "scripts/main.ts",
) {
  return {
    parsed: parseScriptFile(
      path,
      text,
      {
        artifactId: "fixture",
        relativePath: path,
      },
    ),
    text,
  };
}

describe(
  "progression actor accounting analysis",
  () => {
    it("proves a strong actor counter cannot reach its zero gate when reconciliation is absent", () => {
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

    it("does not call an arbitrary decrement safe when death/removal cannot reach it", () => {
      const source = [
        "let remainingEnemies = 0;",
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  observeDeath(event.deadEntity);",
        "});",
        "function observeDeath(entity) {}",
        "function spawnEnemy() { remainingEnemies++; }",
        "function debugFix() { remainingEnemies--; }",
        "function maybeAdvance() {",
        "  if (remainingEnemies === 0) nextWave();",
        "}",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.reconciledFromActorLifecycle,
      ).toBe(0);
      expect(result.unresolvedCounters)
        .toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          decrementWrites: 1,
          lifecycleLinkedDecrements: 0,
          status: "unresolved",
        });
    });

    it("proves decrement reachability from entity death through local helpers", () => {
      const source = [
        "let remainingEnemies = 0;",
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  reconcileEnemyDeath(event.deadEntity);",
        "});",
        "function reconcileEnemyDeath(entity) {",
        "  decrementRemaining();",
        "}",
        "function decrementRemaining() { remainingEnemies--; }",
        "function spawnEnemy() { remainingEnemies++; }",
        "function maybeAdvance() {",
        "  if (remainingEnemies === 0) nextWave();",
        "}",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.reconciledFromActorLifecycle,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          lifecycleLinkedDecrements: 1,
          status:
            "reconciled-from-actor-lifecycle",
        });
    });

    it("proves decrement reachability across imported helper modules", () => {
      const mainText = [
        'import { decrementRemaining } from "./counter.js";',
        "world.afterEvents.entityDie.subscribe(() => {",
        "  decrementRemaining();",
        "});",
      ].join("\n");
      const counterText = [
        "export let remainingEnemies = 0;",
        "export function spawnEnemy() { remainingEnemies++; }",
        "export function decrementRemaining() { remainingEnemies--; }",
        "export function maybeAdvance() {",
        "  if (remainingEnemies === 0) nextWave();",
        "}",
      ].join("\n");
      const main = parsed(
        mainText,
        "scripts/main.ts",
      );
      const counter = parsed(
        counterText,
        "scripts/counter.ts",
      );
      const calls =
        deriveCrossFileCallEdges([
          {
            path: "scripts/main.ts",
            text: mainText,
            source: main.parsed.source,
          },
          {
            path: "scripts/counter.ts",
            text: counterText,
            source: counter.parsed.source,
          },
        ]);

      const result =
        analyzeProgressionActorAccounting(
          [main, counter],
          calls,
        );

      expect(
        result.reconciledFromActorLifecycle,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          counterId:
            "remainingEnemies",
          lifecycleLinkedDecrements: 1,
          status:
            "reconciled-from-actor-lifecycle",
        });
    });

    it("keeps replacement writes unresolved instead of crediting them as actor reconciliation", () => {
      const result =
        analyzeProgressionActorAccounting([
          parsed([
            "let remainingEnemies = 0;",
            "function spawnWave() { remainingEnemies += 3; }",
            "function syncCount(list) { remainingEnemies = list.length; }",
            "function maybeAdvance() {",
            "  if (remainingEnemies <= 0) nextWave();",
            "}",
          ].join("\n")),
        ]);

      expect(
        result.provenMissingReconciliation,
      ).toBe(0);
      expect(result.unresolvedCounters)
        .toBe(1);
    });
  },
);
