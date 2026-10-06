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
  parseEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";
import {
  analyzeProgressionActorAccounting,
} from "../../src/inspection/progression-actor-accounting-analysis.js";
import {
  analyzeArenaLifecycleConvergence,
} from "../../src/arena/arena-lifecycle-analysis.js";
import type {
  EntityEventExternalEvidence,
} from "../../src/inspection/entity-event-evidence.js";

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
    it("does not treat a diagnostic zero check as a progression completion gate", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function debug() {",
        "  if (remainingEnemies === 0) console.warn('zero');",
        "}",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.provenMissingReconciliation,
      ).toBe(0);
      expect(result.counters[0]
        ?.completionChecks ?? 0)
        .toBe(0);
    });

    it("recognizes a zero gate that commits progression state", () => {
      const source = [
        "let remainingEnemies = 0;",
        "let waveState = 'active';",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function maybeAdvance() {",
        "  if (remainingEnemies === 0) waveState = 'complete';",
        "}",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.provenMissingReconciliation,
      ).toBe(1);
      expect(result.counters[0]
        ?.completionChecks)
        .toBe(1);
    });

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

    it("preserves distinct direct spawn calls when proving quantity equality", () => {
      const source = [
        "let remainingEnemies = 0;",
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  if (event.deadEntity.typeId === 'demo:enemy') decrementRemaining();",
        "});",
        "function spawnWave(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  dimension.spawnEntity('demo:enemy', { x: 1, y: 0, z: 0 });",
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
      ).toBe(0);
      expect(result.counters[0])
        .toMatchObject({
          spawnQuantityStatus: "matched",
          quantityComparableGrowths: 1,
          quantityMatchedGrowths: 1,
          reconciliationLifecycleKinds: [
            "death",
          ],
          status:
            "reconciled-from-matched-actor-lifecycle",
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
          reconciliationLifecycleKinds: [
            "remove",
          ],
          removeLinkedDecrements: 1,
          status:
            "reconciled-from-matched-actor-lifecycle",
        });
    });

    it("keeps scripted non-death removal without counter reconciliation as explicit gray-zone evidence", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function cleanupEntity(entity) {",
        "  if (entity.typeId === 'demo:enemy') entity.remove();",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.scriptedRemovalCoverageGaps,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          scriptedRemovalCoverage:
            "uncovered",
          scriptedRemovalActorIdentifiers: [
            "demo:enemy",
          ],
          uncoveredScriptedRemovalActorIdentifiers: [
            "demo:enemy",
          ],
        });
    });

    it("closes scripted removal coverage when entityRemove for the same actor reaches decrement", () => {
      const source = [
        "let remainingEnemies = 0;",
        "world.afterEvents.entityRemove.subscribe((event) => {",
        "  if (event.entity.typeId === 'demo:enemy') decrementRemaining();",
        "});",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function cleanupEntity(entity) {",
        "  if (entity.typeId === 'demo:enemy') entity.remove();",
        "}",
        "function decrementRemaining() { remainingEnemies--; }",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.scriptedRemovalCoverageGaps,
      ).toBe(0);
      expect(result.counters[0])
        .toMatchObject({
          scriptedRemovalCoverage:
            "covered",
          removeLifecycleActorIdentifiers: [
            "demo:enemy",
          ],
        });
    });

    it("detects exact kill-selector disappearance for counted actor type", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function cleanup(dimension) {",
        "  dimension.runCommand('kill @e[type=demo:enemy]');",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");

      const result =
        analyzeProgressionActorAccounting([
          parsed(source),
        ]);

      expect(
        result.scriptedRemovalCoverageGaps,
      ).toBe(1);
      expect(result.counters[0]
        ?.scriptedRemovalActorIdentifiers)
        .toEqual(["demo:enemy"]);
    });

    it("proves base instant-despawn can strand a counted actor counter when remove reconciliation is absent", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const entity =
        parseEntityDefinition(
          {
            "minecraft:entity": {
              description: {
                identifier:
                  "demo:enemy",
              },
              components: {
                "minecraft:instant_despawn": {},
              },
            },
          },
          {
            artifactId: "fixture",
            relativePath:
              "entities/enemy.json",
          },
        );

      const result =
        analyzeProgressionActorAccounting(
          [parsed(source)],
          [],
          [entity],
        );

      expect(
        result
          .provenImmediateDespawnWithoutReconciliation,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          immediateDespawnActorIdentifiers: [
            "demo:enemy",
          ],
          uncoveredImmediateDespawnActorIdentifiers: [
            "demo:enemy",
          ],
          status:
            "instant-despawn-without-reconciliation",
        });
    });

    it("keeps component-group despawn as unresolved until activation reachability is proven", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const entity =
        parseEntityDefinition(
          {
            "minecraft:entity": {
              description: {
                identifier:
                  "demo:enemy",
              },
              component_groups: {
                despawn_state: {
                  "minecraft:instant_despawn": {},
                },
              },
              events: {
                "demo:despawn": {
                  add: {
                    component_groups: [
                      "despawn_state",
                    ],
                  },
                },
              },
            },
          },
          {
            artifactId: "fixture",
            relativePath:
              "entities/enemy.json",
          },
        );

      const result =
        analyzeProgressionActorAccounting(
          [parsed(source)],
          [],
          [entity],
        );

      expect(
        result.conditionalDespawnUnknowns,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          conditionalDespawnActorIdentifiers: [
            "demo:enemy",
          ],
          unresolvedConditionalDespawnActorIdentifiers: [
            "demo:enemy",
          ],
          status: "unresolved",
        });
    });

    it("proves exact instant-despawn activation during active wave state when reconciliation is absent", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function tick(entity, waveState) {",
        "  if (waveState === 'active') {",
        "    entity.triggerEvent('demo:despawn');",
        "  }",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const input = parsed(source);
      const entity =
        parseEntityDefinition(
          {
            "minecraft:entity": {
              description: { identifier: "demo:enemy" },
              component_groups: {
                despawn_state: {
                  "minecraft:instant_despawn": {},
                },
              },
              events: {
                "demo:despawn": {
                  add: {
                    component_groups: ["despawn_state"],
                  },
                },
              },
            },
          },
          {
            artifactId: "fixture",
            relativePath: "entities/enemy.json",
          },
        );
      const external:
        EntityEventExternalEvidence[] = [{
          event: "demo:despawn",
          kind: "event-command",
          entityIdentifier: "demo:enemy",
          executionRegion: "function:tick",
          source: input.parsed.source,
        }];
      const active = [{
        event: "demo:despawn",
        executionRegion: "function:tick",
        source: input.parsed.source,
      }];

      const result =
        analyzeProgressionActorAccounting(
          [input],
          [],
          [entity],
          undefined,
          external,
          active,
        );

      expect(
        result
          .provenActiveInstantDespawnWithoutReconciliation,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          activeInstantDespawnActorIdentifiers: ["demo:enemy"],
          uncoveredActiveInstantDespawnActorIdentifiers: ["demo:enemy"],
          status:
            "active-instant-despawn-without-reconciliation",
        });
    });

    it("proves active instant-despawn through a local helper call", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function tick(entity, waveState) {",
        "  if (waveState === 'active') {",
        "    maybeDespawn(entity);",
        "  }",
        "}",
        "function maybeDespawn(entity) {",
        "  entity.triggerEvent('demo:despawn');",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const input = parsed(source);
      const entity =
        parseEntityDefinition(
          {
            "minecraft:entity": {
              description: { identifier: "demo:enemy" },
              component_groups: {
                despawn_state: {
                  "minecraft:instant_despawn": {},
                },
              },
              events: {
                "demo:despawn": {
                  add: {
                    component_groups: ["despawn_state"],
                  },
                },
              },
            },
          },
          {
            artifactId: "fixture",
            relativePath: "entities/enemy.json",
          },
        );
      const external:
        EntityEventExternalEvidence[] = [{
          event: "demo:despawn",
          kind: "event-command",
          entityIdentifier: "demo:enemy",
          executionRegion: "function:maybeDespawn",
          source: input.parsed.source,
        }];
      const activeCalls = [{
        callerRegion: "function:tick",
        targetName: "maybeDespawn",
        source: input.parsed.source,
      }];

      const result =
        analyzeProgressionActorAccounting(
          [input],
          [],
          [entity],
          undefined,
          external,
          [],
          activeCalls,
        );

      expect(
        result.provenActiveInstantDespawnWithoutReconciliation,
      ).toBe(1);
      expect(result.activeInterproceduralProofs)
        .toBeGreaterThan(0);
    });

    it("proves active instant-despawn through an imported helper call", () => {
      const mainText = [
        'import { maybeDespawn } from "./despawn.js";',
        "function tick(entity, waveState) {",
        "  if (waveState === 'active') {",
        "    maybeDespawn(entity);",
        "  }",
        "}",
      ].join("\n");
      const helperText = [
        "export function maybeDespawn(entity) {",
        "  entity.triggerEvent('demo:despawn');",
        "}",
      ].join("\n");
      const counterText = [
        "export let remainingEnemies = 0;",
        "export function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "export function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const main = parsed(mainText, "scripts/main.ts");
      const helper = parsed(helperText, "scripts/despawn.ts");
      const counter = parsed(counterText, "scripts/counter.ts");
      const calls =
        deriveCrossFileCallEdges([
          {
            path: "scripts/main.ts",
            text: mainText,
            source: main.parsed.source,
          },
          {
            path: "scripts/despawn.ts",
            text: helperText,
            source: helper.parsed.source,
          },
          {
            path: "scripts/counter.ts",
            text: counterText,
            source: counter.parsed.source,
          },
        ]);
      const entity =
        parseEntityDefinition(
          {
            "minecraft:entity": {
              description: { identifier: "demo:enemy" },
              component_groups: {
                despawn_state: {
                  "minecraft:instant_despawn": {},
                },
              },
              events: {
                "demo:despawn": {
                  add: {
                    component_groups: ["despawn_state"],
                  },
                },
              },
            },
          },
          {
            artifactId: "fixture",
            relativePath: "entities/enemy.json",
          },
        );
      const external:
        EntityEventExternalEvidence[] = [{
          event: "demo:despawn",
          kind: "event-command",
          entityIdentifier: "demo:enemy",
          executionRegion: "function:maybeDespawn",
          source: helper.parsed.source,
        }];
      const activeCalls = [{
        callerRegion: "function:tick",
        targetName: "maybeDespawn",
        source: main.parsed.source,
      }];

      const result =
        analyzeProgressionActorAccounting(
          [main, helper, counter],
          calls,
          [entity],
          undefined,
          external,
          [],
          activeCalls,
        );

      expect(
        result.provenActiveInstantDespawnWithoutReconciliation,
      ).toBe(1);
      expect(result.activeInterproceduralProofs)
        .toBeGreaterThan(0);
    });

    it("closes an unreachable conditional despawn path as statically inactive", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const entity =
        parseEntityDefinition(
          {
            "minecraft:entity": {
              description: { identifier: "demo:enemy" },
              component_groups: {
                despawn_state: {
                  "minecraft:instant_despawn": {},
                },
              },
              events: {
                "demo:despawn": {
                  add: {
                    component_groups: ["despawn_state"],
                  },
                },
              },
            },
          },
          {
            artifactId: "fixture",
            relativePath: "entities/enemy.json",
          },
        );

      const result =
        analyzeProgressionActorAccounting(
          [parsed(source)],
          [],
          [entity],
          undefined,
          [],
        );

      expect(result.conditionalDespawnUnknowns)
        .toBe(0);
      expect(result.inactiveConditionalDespawnCounters)
        .toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          inactiveConditionalDespawnActorIdentifiers: ["demo:enemy"],
          unresolvedConditionalDespawnActorIdentifiers: [],
        });
    });

    it("keeps an exact non-terminal external despawn event reachable and unresolved", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function triggerDespawn(entity) {",
        "  entity.triggerEvent('demo:despawn');",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const input = parsed(source);
      const entity =
        parseEntityDefinition(
          {
            "minecraft:entity": {
              description: { identifier: "demo:enemy" },
              component_groups: {
                despawn_state: {
                  "minecraft:instant_despawn": {},
                },
              },
              events: {
                "demo:despawn": {
                  add: {
                    component_groups: ["despawn_state"],
                  },
                },
              },
            },
          },
          {
            artifactId: "fixture",
            relativePath: "entities/enemy.json",
          },
        );
      const evidence:
        EntityEventExternalEvidence[] = [{
          event: "demo:despawn",
          kind: "event-command",
          entityIdentifier: "demo:enemy",
          executionRegion: "function:triggerDespawn",
          source: input.parsed.source,
        }];

      const result =
        analyzeProgressionActorAccounting(
          [input],
          [],
          [entity],
          undefined,
          evidence,
        );

      expect(result.reachableConditionalDespawnCounters)
        .toBe(1);
      expect(result.conditionalDespawnUnknowns)
        .toBe(1);
    });

    it("closes exact conditional despawn activation when every trigger is proven terminal-only", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function endGame(arena, player, entity) {",
        "  arena.players.delete(player);",
        "  arena.generation++;",
        "  triggerDespawn(entity);",
        "}",
        "function triggerDespawn(entity) {",
        "  entity.triggerEvent('demo:despawn');",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const input = parsed(source);
      const lifecycle =
        analyzeArenaLifecycleConvergence(
          [input.parsed],
        );
      const entity =
        parseEntityDefinition(
          {
            "minecraft:entity": {
              description: { identifier: "demo:enemy" },
              component_groups: {
                despawn_state: {
                  "minecraft:instant_despawn": {},
                },
              },
              events: {
                "demo:despawn": {
                  add: {
                    component_groups: ["despawn_state"],
                  },
                },
              },
            },
          },
          {
            artifactId: "fixture",
            relativePath: "entities/enemy.json",
          },
        );
      const evidence:
        EntityEventExternalEvidence[] = [{
          event: "demo:despawn",
          kind: "event-command",
          entityIdentifier: "demo:enemy",
          executionRegion: "function:triggerDespawn",
          source: input.parsed.source,
        }];

      const result =
        analyzeProgressionActorAccounting(
          [input],
          [],
          [entity],
          lifecycle,
          evidence,
        );

      expect(result.conditionalDespawnUnknowns)
        .toBe(0);
      expect(result.terminalOnlyConditionalDespawnCounters)
        .toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          terminalOnlyConditionalDespawnActorIdentifiers: ["demo:enemy"],
          unresolvedConditionalDespawnActorIdentifiers: [],
        });
    });

    it("excludes proven terminal-only cleanup removal from progression coverage gaps", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function endGame(arena, player, entity) {",
        "  cleanupArena(arena, player, entity);",
        "}",
        "function cleanupArena(arena, player, entity) {",
        "  arena.players.delete(player);",
        "  arena.generation++;",
        "  if (entity.typeId === 'demo:enemy') entity.remove();",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const input = parsed(source);
      const lifecycle =
        analyzeArenaLifecycleConvergence(
          [input.parsed],
        );

      const result =
        analyzeProgressionActorAccounting(
          [input],
          [],
          [],
          lifecycle,
        );

      expect(
        result.scriptedRemovalCoverageGaps,
      ).toBe(0);
      expect(
        result.terminalOnlyScriptedRemovalCounters,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          scriptedRemovalScope:
            "terminal-only",
          terminalOnlyScriptedRemovalActorIdentifiers: [
            "demo:enemy",
          ],
          uncoveredScriptedRemovalActorIdentifiers: [],
        });
    });

    it("keeps a cleanup helper non-terminal when an active gameplay caller can also reach it", () => {
      const source = [
        "let remainingEnemies = 0;",
        "function spawnEnemy(dimension) {",
        "  dimension.spawnEntity('demo:enemy', { x: 0, y: 0, z: 0 });",
        "  remainingEnemies++;",
        "}",
        "function endGame(arena, player, entity) {",
        "  cleanupArena(arena, player, entity);",
        "}",
        "function abortWave(arena, player, entity) {",
        "  cleanupArena(arena, player, entity);",
        "}",
        "function cleanupArena(arena, player, entity) {",
        "  arena.players.delete(player);",
        "  arena.generation++;",
        "  if (entity.typeId === 'demo:enemy') entity.remove();",
        "}",
        "function maybeAdvance() { if (remainingEnemies === 0) nextWave(); }",
      ].join("\n");
      const input = parsed(source);
      const lifecycle =
        analyzeArenaLifecycleConvergence(
          [input.parsed],
        );

      const result =
        analyzeProgressionActorAccounting(
          [input],
          [],
          [],
          lifecycle,
        );

      expect(
        result.scriptedRemovalCoverageGaps,
      ).toBe(1);
      expect(
        result.nonTerminalScriptedRemovalCounters,
      ).toBe(1);
      expect(result.counters[0])
        .toMatchObject({
          scriptedRemovalScope:
            "non-terminal",
          nonTerminalScriptedRemovalActorIdentifiers: [
            "demo:enemy",
          ],
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
