import { describe, expect, it } from "vitest";
import {
  deriveScriptEconomyEvidence,
} from "../../../src/domains/economy/economy-evidence.js";

describe("script economy evidence", () => {
  it("captures pickup, grants, drops, and scoreboard transfer semantics", () => {
    const result =
      deriveScriptEconomyEvidence(
        [
          "world.afterEvents.entityItemPickup.subscribe((event) => {",
          "  credits.addScore(event.entity, 4);",
          "});",
          "function grant(container, dimension, location) {",
          "  const apple = new ItemStack('minecraft:golden_apple');",
          "  container.addItem(apple);",
          "  dimension.spawnItem(apple, location);",
          "}",
          "function spend(credits, player) {",
          "  credits.addScore(player, -16);",
          "}",
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
        "pickup-subscription",
        "score-credit",
        "inventory-grant",
        "world-drop",
        "score-debit",
      ]),
    );
    expect(
      result.find(
        (item) =>
          item.kind ===
          "inventory-grant",
      )?.itemIdentifier,
    ).toBe("minecraft:golden_apple");
  });

  it("keeps dynamic scoreboard delta direction unresolved", () => {
    const result =
      deriveScriptEconomyEvidence(
        [
          "function adjust(credits, player, delta) {",
          "  credits.addScore(player, delta);",
          "}",
        ].join("\n"),
        {
          artifactId: "fixture",
          relativePath: "scripts/main.ts",
        },
      );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "score-adjust",
    });
    expect(
      "amount" in result[0]!,
    ).toBe(false);
  });
});
