import { describe, expect, it } from "vitest";
import {
  deriveScriptCombatLifecycleEvidence,
} from "../src/combat-lifecycle-evidence.js";

describe("combat lifecycle evidence", () => {
  it("keeps hurt and death subscriptions separate from secondary effects", () => {
    const result =
      deriveScriptCombatLifecycleEvidence(
        [
          "world.afterEvents.entityHurt.subscribe((event) => {",
          "  event.hurtEntity.applyKnockback(1, 0, 1, 1);",
          "});",
          "world.afterEvents.entityDie.subscribe((event) => {",
          "  event.deadEntity.addEffect('weakness', 20);",
          "});",
        ].join("\n"),
        {
          artifactId: "fixture",
          relativePath: "scripts/main.ts",
        },
      );

    expect(
      result.map((item) => item.kind),
    ).toEqual(
      expect.arrayContaining([
        "hurt-subscription",
        "death-subscription",
        "knockback",
        "effect-apply",
      ]),
    );
  });
});
