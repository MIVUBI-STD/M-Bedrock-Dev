import { describe, expect, it } from "vitest";
import {
  classifyBugSeverity,
  highestBugSeverity,
  routeBugFinderCategory,
  type BugImpactAssessment,
} from "../src/index.js";

const cleanImpact: BugImpactAssessment = {
  progression: "unaffected",
  recovery: "normal",
  stability: "stable",
  coreMechanic: "correct",
  importantState: "correct",
  fairness: "unaffected",
};

describe("bug report severity policy", () => {
  it("classifies blocked mandatory flow as blocker", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        progression: "blocked",
      }),
    ).toBe("blocker");
  });

  it("classifies unrecoverable player state as blocker", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        recovery: "none",
      }),
    ).toBe("blocker");
  });

  it("classifies crash or freeze as blocker", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        stability: "crash-or-freeze",
      }),
    ).toBe("blocker");
  });

  it("classifies materially wrong gameplay mechanics as major", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        coreMechanic: "materially-wrong",
      }),
    ).toBe("major");
  });

  it("classifies materially wrong player state as major", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        importantState: "materially-wrong",
      }),
    ).toBe("major");
  });

  it("classifies gameplay fairness violations as major", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        fairness: "materially-affected",
      }),
    ).toBe("major");
  });

  it("classifies presentation-only defects as minor", () => {
    expect(classifyBugSeverity(cleanImpact)).toBe("minor");
  });

  it("uses the strongest real impact instead of averaging impacts", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        progression: "blocked",
        fairness: "materially-affected",
      }),
    ).toBe("blocker");
  });
});

describe("bug finder category routing", () => {
  it.each([
    ["game-progression", "game-flow"],
    ["player-owned-state", "player-state"],
    ["session-concurrency", "multiplayer-session"],
    ["world-mutation", "world-interaction"],
    ["entity-decision", "entity-behavior"],
    ["combat-rule", "combat"],
    ["score-reward", "score-reward"],
    ["presentation-feedback", "ui-feedback"],
    ["runtime-capacity", "performance-stability"],
    ["runtime-compatibility", "compatibility"],
  ] as const)("routes %s to %s", (failure, category) => {
    expect(routeBugFinderCategory(failure)).toBe(category);
  });

  it("derives finder severity without storing duplicate truth", () => {
    expect(
      highestBugSeverity([
        { severity: "minor" },
        { severity: "major" },
        { severity: "blocker" },
      ]),
    ).toBe("blocker");

    expect(highestBugSeverity([])).toBeUndefined();
  });
});

describe("real M-Bedrock severity corpus", () => {
  it.each([
    [
      "arena cannot restart after defeat",
      {
        ...cleanImpact,
        progression: "blocked",
      },
      "blocker",
    ],
    [
      "water can mutate blocks outside active plot",
      {
        ...cleanImpact,
        coreMechanic: "materially-wrong",
        fairness: "materially-affected",
      },
      "major",
    ],
    [
      "friendly fire is enabled when team damage is forbidden",
      {
        ...cleanImpact,
        coreMechanic: "materially-wrong",
        fairness: "materially-affected",
      },
      "major",
    ],
    [
      "match inventory remains after returning to lobby",
      {
        ...cleanImpact,
        importantState: "materially-wrong",
      },
      "major",
    ],
    [
      "join-pad particle is missing",
      cleanImpact,
      "minor",
    ],
  ] as const)("classifies %s as %s", (_name, impact, severity) => {
    expect(classifyBugSeverity(impact)).toBe(severity);
  });
});

describe("real M-Bedrock category corpus", () => {
  it.each([
    ["arena cannot restart after defeat", "game-progression", "game-flow"],
    ["inventory does not reset", "player-owned-state", "player-state"],
    ["reconnect can retain stale session state", "session-concurrency", "multiplayer-session"],
    ["water affects blocks outside plot", "world-mutation", "world-interaction"],
    ["zombie navigation stalls on route", "entity-decision", "entity-behavior"],
    ["friendly fire is enabled", "combat-rule", "combat"],
    ["coin distribution is incorrect", "score-reward", "score-reward"],
    ["join-pad particle is missing", "presentation-feedback", "ui-feedback"],
    ["all arenas active causes runtime degradation", "runtime-capacity", "performance-stability"],
    ["Script API behavior changes across target runtime", "runtime-compatibility", "compatibility"],
  ] as const)("routes %s through %s to %s", (_name, failure, category) => {
    expect(routeBugFinderCategory(failure)).toBe(category);
  });
});
