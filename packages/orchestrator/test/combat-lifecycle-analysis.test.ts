import { describe, expect, it } from "vitest";
import { parseScriptFile } from "../../../analyzers/scripts/src/index.js";
import {
  analyzeCombatLifecycle,
} from "../src/combat-lifecycle-analysis.js";

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
