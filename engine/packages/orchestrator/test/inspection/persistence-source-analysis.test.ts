import { describe, expect, it } from "vitest";
import {
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import {
  analyzePersistenceSource,
} from "../../src/inspection/persistence-source-analysis.js";

describe("persistence source analysis", () => {
  it("summarizes growth without promoting it to a defect", () => {
    const script = parseScriptFile(
      "main",
      `
        const history = JSON.parse(
          world.getDynamicProperty("history") ?? "[]"
        );
        history.push("match");
        world.setDynamicProperty(
          "history",
          JSON.stringify(history),
        );
      `,
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzePersistenceSource([script]);

    expect(result.appendWithoutClear).toBe(1);
    expect(
      result.worldScopedAppendWithoutClear,
    ).toBe(1);
    expect(result.properties[0]).toMatchObject({
      propertyId: "history",
      scope: "world",
      lifetime: "world",
      growth: "append-without-clear",
    });
  });

  it("keeps persisted session state read on reconnect as an explicit reconciliation gap", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.playerJoin.subscribe((event) => {",
        "  restoreSession(event.player);",
        "});",
        "function restoreSession(player) {",
        "  const state = world.getDynamicProperty('matchSession');",
        "  return state;",
        "}",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzePersistenceSource([script]);

    expect(
      result.reconnectTransientRestoreRiskCount,
    ).toBe(1);
    expect(
      result.reconnectTransientRestoreRisks[0],
    ).toMatchObject({
      propertyId: "matchSession",
      lifecycleEvent: "playerJoin",
      scope: "session",
    });
  });

  it("does not flag player-durable reconnect reads as transient session restore", () => {
    const script = parseScriptFile(
      "main",
      [
        "world.afterEvents.playerJoin.subscribe((event) => {",
        "  const xp = event.player.getDynamicProperty('progressionXp');",
        "  return xp;",
        "});",
      ].join("\n"),
      {
        artifactId: "fixture",
        relativePath: "scripts/main.ts",
      },
    );

    const result =
      analyzePersistenceSource([script]);

    expect(
      result.reconnectTransientRestoreRiskCount,
    ).toBe(0);
  });
});
