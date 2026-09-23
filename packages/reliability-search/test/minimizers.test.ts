import { describe, expect, it } from "vitest";
import {
  minimizeGraphFixture,
  minimizeSourceLines,
  minimizeTimedScenario,
} from "../src/index.js";

describe("domain-specific minimizers", () => {
  it("minimizes source text by relevant lines", async () => {
    const source = [
      "noise-a",
      "critical-start",
      "noise-b",
      "critical-end",
      "noise-c",
    ].join("\n");

    const result = await minimizeSourceLines(
      source,
      (candidate) =>
        candidate.includes("critical-start") &&
        candidate.includes("critical-end"),
    );

    expect(result.minimizedText).toContain("critical-start");
    expect(result.minimizedText).toContain("critical-end");
    expect(result.minimizedLines).toBe(2);
  });

  it("minimizes timed scenarios and normalizes unnecessary absolute delay", async () => {
    const actions = [
      { tick: 10, action: { kind: "join" as const, playerId: "p1" } },
      { tick: 11, action: { kind: "start" as const, playerId: "p1" } },
      { tick: 12, action: { kind: "start" as const, playerId: "p2" } },
      { tick: 30, action: { kind: "reset-arena" as const, arenaId: "noise" } },
    ];

    const result = await minimizeTimedScenario(
      actions,
      (candidate) => {
        const kinds = candidate.map((entry) => entry.action.kind);
        return kinds.filter((kind) => kind === "start").length >= 2;
      },
    );

    expect(result.actions).toHaveLength(2);
    expect(result.actions[0]?.tick).toBe(0);
  });

  it("minimizes dependency graph fixtures by irrelevant nodes", async () => {
    const nodes = [
      { id: "root", value: "calls-child" },
      { id: "child", value: "target" },
      { id: "noise", value: "unrelated" },
    ];

    const result = await minimizeGraphFixture(
      nodes,
      (candidate) =>
        candidate.some((node) => node.id === "root") &&
        candidate.some((node) => node.id === "child"),
    );

    expect(result.nodes.map((node) => node.id).sort()).toEqual(["child", "root"]);
  });
});
