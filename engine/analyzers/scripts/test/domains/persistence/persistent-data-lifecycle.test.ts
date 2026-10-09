import { describe, expect, it } from "vitest";
import {
  derivePersistentDataLifecycleEvidence,
} from "../../../src/domains/persistence/persistent-data-lifecycle.js";

describe("persistent data lifecycle evidence", () => {
  it("retains property-specific reset-like source sites and separates removal from empty writes", () => {
    const source = { artifactId: "a", relativePath: "scripts/round.ts" };
    const result = derivePersistentDataLifecycleEvidence([
      "function resetRound(player) {",
      '  player.setDynamicProperty("roundState", undefined);',
      '  player.setDynamicProperty("roundState", "[]");',
      "  world.clearDynamicProperties();",
      "}",
      'world.setDynamicProperty("otherState", null);',
    ].join("\n"), source);
    const round = result.find(x => x.propertyKey === "roundState");
    expect(round?.clears).toBe(2);
    expect(round?.resetSites).toEqual([
      expect.objectContaining({
        propertyKey: "roundState", receiverHint: "player",
        executionRegion: "function:resetRound", kind: "undefined-removal",
        source: expect.objectContaining({
          artifactId: "a", relativePath: "scripts/round.ts",
          range: expect.objectContaining({ lineStart: 2 }),
        }),
      }),
      expect.objectContaining({
        propertyKey: "roundState", receiverHint: "player",
        executionRegion: "function:resetRound", kind: "empty-value-write",
        source: expect.objectContaining({
          range: expect.objectContaining({ lineStart: 3 }),
        }),
      }),
    ]);
    expect(result.find(x => x.propertyKey === "otherState")
      ?.resetSites?.map(x => x.kind)).toEqual(["empty-value-write"]);
    expect(result.every(x => x.resetSites?.every(site =>
      site.source.range?.lineStart !== 4) ?? true)).toBe(true);
  });

  it("does not assign broad clearDynamicProperties to an unrelated literal key", () => {
    const result = derivePersistentDataLifecycleEvidence([
      'const phase = world.getDynamicProperty("phase");',
      "world.clearDynamicProperties();",
    ].join("\n"), {
      artifactId: "a", relativePath: "scripts/main.ts",
    });
    expect(result.find(x => x.propertyKey === "phase")?.resetSites ?? [])
      .toEqual([]);
  });


  it("flags append/writeback without a visible clear as growth risk evidence", () => {
    const result = derivePersistentDataLifecycleEvidence(
      `
        const history = JSON.parse(
          world.getDynamicProperty("matchHistory") ?? "[]"
        );
        history.push({ score: 10 });
        world.setDynamicProperty("matchHistory", JSON.stringify(history));
      `,
      { artifactId: "artifact:test", relativePath: "scripts/main.ts" },
    );

    expect(result[0]).toEqual(
      expect.objectContaining({
        propertyKey: "matchHistory",
        appends: 1,
        writes: 1,
        growth: "append-without-clear",
      }),
    );
  });
});
