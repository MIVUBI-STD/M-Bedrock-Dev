import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeCombatLifecycle,
} from "../../src/inspection/combat-lifecycle-analysis.js";

describe("combat lifecycle analysis", () => {
  it("keeps hurt-only handling as a terminal-lifecycle review risk", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityHurt.subscribe((event) => {",
        "  event.hurtEntity.applyKnockback(1, 0, 1, 1);",
        "});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeCombatLifecycle([script]);

    expect(result).toMatchObject({
      hurtHandlers: 1,
      deathHandlers: 0,
      hurtOnlyTerminalRisk: 1,
      secondaryEffects: 1,
    });
  });

  it("follows callback call graph without merging hurt and death paths", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityHurt.subscribe((event) => {",
        "  applyCombatEffects(event.hurtEntity);",
        "});",
        "world.afterEvents.entityDie.subscribe((event) => {",
        "  finishElimination(event.deadEntity);",
        "});",
        "function applyCombatEffects(entity) {",
        "  entity.applyKnockback(1, 0, 1, 1);",
        "}",
        "function finishElimination(entity) {",
        "  entity.addEffect('weakness', 20);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeCombatLifecycle([script]);
    const hurt = result.paths.find(
      (item) => item.event === "hurt",
    );
    const death = result.paths.find(
      (item) => item.event === "death",
    );

    expect(hurt).toMatchObject({
      knockbackEffects: 1,
      statusEffects: 0,
    });
    expect(death).toMatchObject({
      knockbackEffects: 0,
      statusEffects: 1,
    });
  });

  it("proves explicit arena/team scope gating on hurt handling", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityHurt.subscribe((event) => {",
        "  const victimArena = arenaOf(event.hurtEntity);",
        "  const attackerArena = arenaOf(event.damageSource.damagingEntity);",
        "  if (victimArena !== attackerArena) return;",
        "  event.hurtEntity.applyKnockback(1, 0, 1, 1);",
        "});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeCombatLifecycle([script]);

    expect(
      result.explicitCombatScopeGuards,
    ).toBe(1);
    expect(
      result.hurtHandlersWithoutScopeGuard,
    ).toBe(0);
    expect(
      result.secondaryEffectPathsWithoutScopeGuard,
    ).toBe(0);
  });

  it("keeps hurt handling without explicit arena/team comparison as a scope gap", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.entityHurt.subscribe((event) => {",
        "  event.hurtEntity.applyKnockback(1, 0, 1, 1);",
        "});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeCombatLifecycle([
        script,
      ]);
    expect(
      result.hurtHandlersWithoutScopeGuard,
    ).toBe(1);
    expect(
      result.secondaryEffectPathsWithoutScopeGuard,
    ).toBe(1);
  });

  it("reports projectile cleanup gap only for projectile-bounded evidence", () => {
    const script = parseScriptFile(
      "main",
      [
        "function fire(projectileComponent, direction) {",
        "  projectileComponent.shoot(direction);",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzeCombatLifecycle([script]);

    expect(result.projectileSpawns).toBe(1);
    expect(result.projectileRemovals).toBe(0);
    expect(result.projectileCleanupGap).toBe(1);
  });
});
