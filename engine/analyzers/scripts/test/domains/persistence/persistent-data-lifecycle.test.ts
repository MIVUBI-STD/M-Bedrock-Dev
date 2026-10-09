import { describe, expect, it } from "vitest";
import {
  derivePersistentDataLifecycleEvidence,
} from "../../../src/domains/persistence/persistent-data-lifecycle.js";

describe("persistent data lifecycle evidence", () => {
  it("retains a direct reset statement's lexical block and excludes nested calls", () => {
    const output = derivePersistentDataLifecycleEvidence([
      "function reset(arena, flag) {",
      '  arena.setDynamicProperty("phase", undefined);',
      '  if (flag) { arena.setDynamicProperty("phase", undefined); }',
      '  if (flag) arena.setDynamicProperty("phase", undefined);',
      '  consume(arena.setDynamicProperty("phase", undefined));',
      "}",
    ].join("\n"), {
      artifactId: "artifact:test", relativePath: "scripts/main.ts",
    });
    const sites = output.find(x => x.propertyKey === "phase")?.resetSites ?? [];
    expect(sites).toHaveLength(4);
    expect(sites[0]?.sequentialBlockSource?.range?.lineStart).toBe(1);
    expect(sites[1]?.sequentialBlockSource?.range?.lineStart).toBe(3);
    expect(sites[2]?.sequentialBlockSource).toBeUndefined();
    expect(sites[3]?.sequentialBlockSource).toBeUndefined();
  });

  it("captures preceding exits and rebindings for direct reset statements", () => {
    const rows = derivePersistentDataLifecycleEvidence([
      "function reset(arena, otherArena, skip) {",
      '  arena.setDynamicProperty("round", undefined);',
      "  arena = otherArena;",
      "  if (skip) return;",
      '  arena.setDynamicProperty("round", undefined);',
      "}",
    ].join("\n"), {
      artifactId: "artifact:test", relativePath: "scripts/main.ts",
    });
    const sites = rows.find(item => item.propertyKey === "round")?.resetSites ?? [];
    expect(sites).toHaveLength(2);
    expect(sites[0]?.sequentialPathEvidence?.precedingControlExitSources)
      .toEqual([]);
    expect(sites[0]?.sequentialPathEvidence?.precedingReceiverRebindingSources)
      .toEqual([]);
    expect(sites[1]?.sequentialPathEvidence?.precedingControlExitSources
      .map(item => item.range?.lineStart)).toEqual([4]);
    expect(sites[1]?.sequentialPathEvidence?.precedingReceiverRebindingSources
      .map(item => item.range?.lineStart)).toEqual([3]);
  });

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
