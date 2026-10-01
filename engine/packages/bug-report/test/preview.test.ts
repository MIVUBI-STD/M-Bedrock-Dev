import { describe, expect, it } from "vitest";
import {
  BUG_REPORT_V2_SCHEMA,
  projectBugReportPreview,
  renderBugReportPreviewMarkdown,
  type BugReportV2,
} from "../src/index.js";

function report(): BugReportV2 {
  return {
    schema: BUG_REPORT_V2_SCHEMA,
    map: {
      name: "Beach Bedwars",
      mapVersion: "1.0.4",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer",
    bugs: [
      {
        id: "BUG-002",
        fixed: false,
        severity: "minor",
        category: "ui-feedback",
        foundBy: "tester",
        title: "Join feedback persists",
        problem: "Join feedback remains visible after leaving.",
        expected: "Feedback clears after leaving.",
        observed: "Feedback remains visible.",
        reproduction: [
          "Enter the join area.",
          "Leave the join area.",
          "Confirm the feedback remains visible.",
        ],
      },
      {
        id: "BUG-001",
        fixed: false,
        severity: "blocker",
        category: "game-flow",
        foundBy: "ai",
        title: "Match cannot restart",
        problem: "A completed arena cannot start again.",
        expected: "The arena can start a new match.",
        observed: "The previous session remains active.",
        reproduction: [
          "Finish a match.",
          "Return to the lobby.",
          "Start the same arena again.",
          "Confirm the new match does not start.",
        ],
        suggestedFix: "Clear stale session ownership during cleanup.",
        aiAnalysis: "Cleanup leaves stale session ownership.",
        relevantCode: [{
          file: "scripts/session.ts",
          reason: "Owns arena session cleanup.",
        }],
      },
      {
        id: "BUG-003",
        fixed: true,
        severity: "major",
        category: "combat",
        foundBy: "tester",
        title: "Fixed combat issue",
        problem: "Already fixed.",
        expected: "Works.",
        observed: "Was broken.",
        reproduction: [
          "Trigger the combat state.",
          "Confirm the fixed behavior remains correct.",
        ],
      },
    ],
  };
}

describe("bug report preview", () => {
  it("defaults to open bugs ordered by severity", () => {
    const preview = projectBugReportPreview(report());

    expect(preview.bugs.map((bug) => bug.id)).toEqual([
      "BUG-001",
      "BUG-002",
    ]);
    expect(preview.counts).toEqual({
      open: 2,
      fixed: 1,
      total: 3,
      blocker: 1,
      major: 0,
      minor: 1,
    });
  });

  it("keeps action grounded in Suggested Fix", () => {
    const preview = projectBugReportPreview(report(), {
      mode: "summary",
    });

    expect(preview.bugs[0]?.action).toBe(
      "Clear stale session ownership during cleanup.",
    );
    expect(preview.bugs[1]?.action).toBeUndefined();
  });

  it("keeps technical context out of standard preview", () => {
    const standard = projectBugReportPreview(report(), {
      mode: "standard",
    });
    const full = projectBugReportPreview(report(), {
      mode: "full",
    });

    expect(standard.bugs[0]?.technicalAnalysis).toBeUndefined();
    expect(full.bugs[0]?.technicalAnalysis).toBe(
      "Cleanup leaves stale session ownership.",
    );
  });

  it("renders issue before evidence and technical context", () => {
    const preview = projectBugReportPreview(report(), {
      mode: "full",
    });
    const markdown = renderBugReportPreviewMarkdown(preview, "full");

    expect(markdown).toContain("| **Bug Trigger (In-Game)** | 1) Finish a match.");
    expect(markdown).toContain("| #1 · BLOCKER | Match cannot restart |");

    expect(markdown.indexOf("**Issue:**")).toBeLessThan(
      markdown.indexOf("**Expected:**"),
    );
    expect(markdown.indexOf("**Expected:**")).toBeLessThan(
      markdown.indexOf("**Technical:**"),
    );
  });
});
