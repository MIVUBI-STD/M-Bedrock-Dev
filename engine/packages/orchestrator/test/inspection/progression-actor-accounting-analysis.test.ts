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
    it("proves missing reconciliation when a strong actor counter only grows", () => {
      const result =
        analyzeProgressionActorAccounting([
          parsed([
            "let remainingEnemies = 0;",
            "function spawnEnemy(dimension) {",
            "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
            "  remainingEnemies += 1;",
            "}",
            "function maybeAdvance() {",
            "  if (remainingEnemies <= 0) nextWave();",
            "}",
          ].join("\n")),
        ]);

      expect(
        result.provenMissingReconciliation,
      ).toBe(1);
    });

    it("keeps a lifecycle decrement unresolved when actor identity is not guarded", () => {
      const source = [
        "let remainingEnemies = 0;",
        "world.afterEvents.entityDie.subscribe(() => {",
        "  decrementRemaining();",
        "});",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function decrementRemaining() { remainingEnemies--; }",
        "function maybeAdvance() {",
        "  if (remainingEnemies === 0) nextWave();",
        "}",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.unresolvedCounters,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          lifecycleLinkedDecrements: 1,
          actorIdentityStatus:
            "unresolved",
          status: "unresolved",
        });
    });

    it("proves matched actor identity from spawn through guarded death reconciliation", () => {
      const source = [
        "let remainingEnemies = 0;",
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  if (event.deadEntity.typeId === 'demo:enemy') {",
        "    decrementRemaining();",
        "  }",
        "});",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function decrementRemaining() { remainingEnemies--; }",
        "function maybeAdvance() {",
        "  if (remainingEnemies === 0) nextWave();",
        "}",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result
          .reconciledFromMatchedActorLifecycle,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          actorIdentityStatus: "matched",
          spawnLinkedActorIdentifiers: [
            "demo:enemy",
          ],
          lifecycleActorIdentifiers: [
            "demo:enemy",
          ],
          matchedActorIdentifiers: [
            "demo:enemy",
          ],
          spawnQuantityStatus:
            "matched",
          status:
            "reconciled-from-matched-actor-lifecycle",
        });
    });

    it("proves actor identity mismatch when growth and death reconciliation target different entity types", () => {
      const source = [
        "let remainingEnemies = 0;",
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  if (event.deadEntity.typeId === 'demo:other') {",
        "    decrementRemaining();",
        "  }",
        "});",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function decrementRemaining() { remainingEnemies--; }",
        "function maybeAdvance() {",
        "  if (remainingEnemies === 0) nextWave();",
        "}",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.provenActorIdentityMismatch,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          actorIdentityStatus: "mismatch",
          spawnLinkedActorIdentifiers: [
            "demo:enemy",
          ],
          lifecycleActorIdentifiers: [
            "demo:other",
          ],
          matchedActorIdentifiers: [],
          status:
            "actor-identity-mismatch",
        });
    });

    it("proves deterministic spawn quantity mismatch against actor counter growth", () => {
      const source = [
        "let remainingEnemies = 0;",
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  if (event.deadEntity.typeId === 'demo:enemy') decrementRemaining();",
        "});",
        "function spawnWave(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies += 2;",
        "}",
        "function decrementRemaining() { remainingEnemies--; }",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.provenSpawnQuantityMismatch,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          spawnQuantityStatus:
            "mismatch",
          quantityComparableGrowths: 1,
          quantityMismatchGrowths: 1,
          status:
            "spawn-quantity-mismatch",
        });
    });

    it("keeps looped spawn quantity unresolved instead of inventing a mismatch", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnWave(dimension) {",
        "  for (let i = 0; i < 3; i++) {",
        "    dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  }",
        "  remainingEnemies += 3;",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.provenSpawnQuantityMismatch,
      ).toBe(0);
      expect(result.counters[0]
        ?.spawnQuantityStatus)
        .toBe("unresolved");
    });

    it("accepts non-death entity-remove reconciliation when the same actor identity reaches decrement", () => {
      const source = [
        "let remainingEnemies = 0;",
        "world.afterEvents.entityRemove.subscribe((event) => {",
        "  if (event.entity.typeId === 'demo:enemy') decrementRemaining();",
        "});",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function decrementRemaining() { remainingEnemies--; }",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result
          .reconciledFromMatchedActorLifecycle,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          actorIdentityStatus: "matched",
          spawnQuantityStatus: "matched",
          status:
            "reconciled-from-matched-actor-lifecycle",
        });
    });

    it("proves matched actor reconciliation across imported counter helpers", () => {
      const mainText = [
        'import { decrementRemaining } from "./counter.js";',
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  if (event.deadEntity.typeId === 'demo:enemy') {",
        "    decrementRemaining();",
        "  }",
        "});",
      ].join("\n");
      const counterText = [
        "export let remainingEnemies = 0;",
        "export function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
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
        result
          .reconciledFromMatchedActorLifecycle,
      ).toBe(1);
      expect(
        result.counters[0]
          ?.matchedActorIdentifiers,
      ).toEqual(["demo:enemy"]);
    });
  },
);
