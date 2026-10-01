import {
  describe,
  expect,
  it,
} from "vitest";
import {
  reviewBugReportReadiness,
  type BugReportV2Bug,
} from "../src/index.js";

function readyBug(): BugReportV2Bug {
  return {
    id: "BUG-001",
    fixed: false,
    severity: "major",
    category: "game-flow",
    foundBy: "ai",
    title: "Match cannot restart",
    problem: "The arena cannot start another match.",
    expected: "The arena starts another match.",
    observed: "The start interaction no longer works.",
    reproduction: [
      "Finish a match and return to the lobby.",
      "Start the same arena again.",
      "Confirm the new match does not start.",
    ],
    aiAnalysis:
      "Cleanup leaves stale arena ownership after match end.",
    relevantCode: [{
      file: "scripts/session.ts",
      reason: "Owns arena session cleanup.",
    }],
    suggestedFix:
      "Clear arena ownership during match cleanup.",
  };
}

describe("bug report readiness", () => {
  it("accepts a tester-ready bug", () => {
    expect(
      reviewBugReportReadiness([readyBug()]),
    ).toEqual([]);
  });

  it("separates confirmed data from missing tester trigger", () => {
    const {
      reproduction: _reproduction,
      ...bug
    } = readyBug();

    expect(
      reviewBugReportReadiness([bug as BugReportV2Bug])
        .map((issue) => issue.code),
    ).toContain("missing-bug-trigger");
  });

  it("requires technical support for AI-found bugs", () => {
    const {
      aiAnalysis: _analysis,
      relevantCode: _code,
      ...bug
    } = readyBug();

    expect(
      reviewBugReportReadiness([bug as BugReportV2Bug])
        .map((issue) => issue.code),
    ).toEqual(
      expect.arrayContaining([
        "ai-missing-analysis",
        "ai-missing-relevant-code",
        "solution-without-support",
      ]),
    );
  });
});
