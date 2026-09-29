import {
  describe,
  expect,
  it,
} from "vitest";
import {
  promoteConfirmedBugsToV2,
  reviewConfirmedBugInputs,
} from "../src/index.js";

const map = {
  name: "Beach Bedwars",
  mapVersion: "1.0.4",
  baseVersion: "1.26.20",
  testedVersion: "1.26.32",
};

describe("confirmed bug promotion", () => {
  it("promotes only confirmed defects into canonical V2", () => {
    const result = promoteConfirmedBugsToV2({
      map,
      repairBy: "developer",
      bugs: [{
        status: "confirmed-defect",
        id: "BUG-BBW-001",
        severity: "major",
        category: "multiplayer-session",
        foundBy: "ai",
        title: "Reconnect loses arena state",
        problem: "The player returns to the lobby after reconnecting.",
        expected: "The player remains assigned to the same arena.",
        observed: "The previous arena membership remains bound to the old session.",
        aiAnalysis: "Reconnect creates a new session without fully rebinding arena membership.",
        relevantCode: [{
          file: "scripts/session.ts",
          reason: "Owns reconnect session membership.",
        }],
        suggestedFix: "Rebind arena membership to the new session.",
        mustPreserve: [
          "Same-arena reconnect behavior.",
          "Cross-arena isolation.",
        ],
      }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.bugs).toHaveLength(1);
    expect(result.report.bugs[0]?.fixed).toBe(false);
    expect("status" in result.report.bugs[0]!).toBe(false);
  });

  it("requires gameplay reproduction for tester-found confirmed defects", () => {
    const issues = reviewConfirmedBugInputs([{
      status: "confirmed-defect",
      id: "BUG-BBW-002",
      severity: "major",
      category: "game-flow",
      foundBy: "tester",
      title: "Match cannot restart",
      problem: "A second match cannot start.",
      expected: "The arena can start another match.",
      observed: "The start interaction no longer works.",
    }]);

    expect(issues.map((issue) => issue.code)).toContain(
      "tester-missing-reproduction",
    );
  });

  it("requires technical basis for AI-found confirmed defects", () => {
    const issues = reviewConfirmedBugInputs([{
      status: "confirmed-defect",
      id: "BUG-BBW-003",
      severity: "minor",
      category: "ui-feedback",
      foundBy: "ai",
      title: "Feedback remains visible",
      problem: "Feedback persists after leaving.",
      expected: "Feedback clears.",
      observed: "The UI state is not cleared.",
    }]);

    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "ai-missing-analysis",
        "ai-missing-relevant-code",
      ]),
    );
  });

  it("keeps Relevant Code focused on primary locations", () => {
    const issues = reviewConfirmedBugInputs([{
      status: "confirmed-defect",
      id: "BUG-BBW-004",
      severity: "major",
      category: "player-state",
      foundBy: "ai",
      title: "Inventory persists",
      problem: "Match items remain in the lobby.",
      expected: "Match-owned items are cleared.",
      observed: "Cleanup does not clear match items.",
      aiAnalysis: "Inventory cleanup is missing from the match-end path.",
      relevantCode: [1, 2, 3, 4].map((index) => ({
        file: "scripts/file-" + index + ".ts",
        reason: "Candidate location " + index,
      })),
    }]);

    expect(issues.map((issue) => issue.code)).toContain(
      "too-many-relevant-code-locations",
    );
  });
});
