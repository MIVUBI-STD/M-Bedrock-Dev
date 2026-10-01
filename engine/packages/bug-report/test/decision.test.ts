import { describe, expect, it } from "vitest";
import {
  classifyBugCandidate,
  classifyBugSeverity,
  highestBugSeverity,
  routeBugFinderCategory,
  shouldIncludeInDefaultBugReport,
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

describe("bug candidate reportability", () => {
  it("rejects grounded game design as a bug", () => {
    expect(classifyBugCandidate({
      intent: "grounded-designed-behavior",
      playerImpact: "blocking",
      testerObservable: true,
    })).toEqual({
      disposition: "designed-behavior",
      reportable: false,
    });
  });

  it("rejects ambiguous intent instead of guessing", () => {
    expect(classifyBugCandidate({
      intent: "ambiguous",
      playerImpact: "material",
      testerObservable: true,
    }).disposition).toBe("ambiguous-intent");
  });

  it("rejects technical-only findings with no tester-visible trigger", () => {
    expect(classifyBugCandidate({
      intent: "grounded-contradiction",
      playerImpact: "material",
      testerObservable: false,
    }).disposition).toBe("tester-trigger-missing");
  });

  it("keeps limited issues out of the default report", () => {
    expect(classifyBugCandidate({
      intent: "grounded-contradiction",
      playerImpact: "limited",
      testerObservable: true,
    }).disposition).toBe("below-report-threshold");
  });

  it("reports grounded player-visible material failures", () => {
    expect(classifyBugCandidate({
      intent: "grounded-contradiction",
      playerImpact: "material",
      testerObservable: true,
    })).toEqual({
      disposition: "reportable-bug",
      reportable: true,
    });
  });
});

describe("bug report severity policy", () => {
  it("classifies blocked mandatory flow without normal recovery as blocker", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        progression: "blocked",
        recovery: "abnormal",
      }),
    ).toBe("blocker");
  });

  it("keeps recoverable blocked flow at major", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        progression: "blocked",
        recovery: "normal",
      }),
    ).toBe("major");
  });

  it("does not make recovery alone a blocker without gameplay impact", () => {
    expect(
      classifyBugSeverity({
        ...cleanImpact,
        recovery: "none",
      }),
    ).toBe("minor");
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

  it("shows only blocker and major in the default report", () => {
    expect(shouldIncludeInDefaultBugReport("blocker")).toBe(true);
    expect(shouldIncludeInDefaultBugReport("major")).toBe(true);
    expect(shouldIncludeInDefaultBugReport("minor")).toBe(false);
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
