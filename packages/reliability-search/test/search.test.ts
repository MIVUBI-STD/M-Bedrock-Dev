import { describe, expect, it } from "vitest";
import {
  ddmin,
  exploreInterleavings,
  runCoverageGuidedSearch,
  scheduledSessionActions,
  sessionCoverageSearchDomain,
  sessionSemanticCoverage,
  type SessionSearchInput,
} from "../src/index.js";

describe("semantic coverage-guided search", () => {
  it("retains only inputs that add semantic coverage or fail", async () => {
    const seed: SessionSearchInput = {
      arenaIds: ["arena1", "arena2"],
      actions: [
        { kind: "join", playerId: "p1" },
        { kind: "assign", playerId: "p1", arenaId: "arena1" },
        { kind: "start", playerId: "p1" },
        { kind: "join", playerId: "p2" },
        { kind: "assign", playerId: "p2", arenaId: "arena2" },
        { kind: "start", playerId: "p2" },
      ],
    };

    const result = await runCoverageGuidedSearch(
      [seed],
      sessionCoverageSearchDomain,
      { maxEvaluations: 40, maxCorpusEntries: 20 },
    );

    expect(result.evaluations).toBeGreaterThan(0);
    expect(result.corpus.length).toBeGreaterThan(0);
    expect(result.coverage.features).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: "state" }),
      expect.objectContaining({ dimension: "transition" }),
      expect.objectContaining({ dimension: "action-pair" }),
      expect.objectContaining({ dimension: "interaction" }),
    ]));
  });

  it("semantic coverage is deterministic for identical inputs", () => {
    const input: SessionSearchInput = {
      arenaIds: ["arena1"],
      actions: [
        { kind: "join", playerId: "p1" },
        { kind: "assign", playerId: "p1", arenaId: "arena1" },
      ],
    };

    expect(sessionSemanticCoverage(input).coverage)
      .toEqual(sessionSemanticCoverage(input).coverage);
  });
});

describe("systematic interleaving exploration", () => {
  it("collapses schedules that differ only by independent operations", () => {
    const operations = scheduledSessionActions([
      { kind: "join", playerId: "p1" },
      { kind: "join", playerId: "p2" },
      { kind: "progress", playerId: "p1", amount: 1 },
    ]);

    const result = exploreInterleavings(operations, { maxSchedules: 20 });

    expect(result.exploredPermutations).toBe(6);
    expect(result.schedules.length).toBeLessThan(6);
    expect(result.reducedEquivalentSchedules).toBeGreaterThan(0);
  });

  it("keeps dependent ordering distinctions", () => {
    const operations = scheduledSessionActions([
      { kind: "join", playerId: "p1" },
      { kind: "progress", playerId: "p1", amount: 1 },
    ]);

    const result = exploreInterleavings(operations, { maxSchedules: 10 });

    expect(result.schedules).toHaveLength(2);
  });
});

describe("failure minimization", () => {
  it("reduces a failing action list to a 1-minimal reproduction", async () => {
    const actions = ["noise-a", "start-p1", "noise-b", "start-p2", "noise-c"];

    const result = await ddmin(
      actions,
      (candidate) =>
        candidate.includes("start-p1") && candidate.includes("start-p2"),
    );

    expect(result.minimized).toEqual(["start-p1", "start-p2"]);
    expect(result.minimizedLength).toBe(2);
    expect(result.originalLength).toBe(5);
  });
});
