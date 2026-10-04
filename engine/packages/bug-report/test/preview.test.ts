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
        aiAnalysis: [
          "Root Cause",
          "Cleanup leaves stale session ownership.",
          "",
          "Verification",
          "1. Finish one match.",
          "2. Start the same arena again.",
        ].join("\n"),
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
  it("defaults to open blocker/major bugs only", () => {
    const preview = projectBugReportPreview(report());

    expect(preview.bugs.map((bug) => bug.id)).toEqual([
      "BUG-001",
    ]);
    expect(preview.counts).toEqual({
      open: 1,
      fixed: 1,
      total: 2,
      blocker: 1,
      major: 0,
      minor: 0,
    });
  });

  it("can intentionally include minor issues", () => {
    const preview = projectBugReportPreview(report(), {
      includeMinor: true,
    });

    expect(preview.bugs.map((bug) => bug.id)).toEqual([
      "BUG-001",
      "BUG-002",
    ]);
    expect(preview.counts.minor).toBe(1);
  });

  it("separates design mismatches from bugs", () => {
    const base = report();
    const typed: BugReportV2 = {
      ...base,
      bugs: base.bugs.map((bug) =>
        bug.id === "BUG-001"
          ? {
              ...bug,
              issueType: "DESIGN_MISMATCH" as const,
            }
          : bug
      ),
    };
    const preview = projectBugReportPreview(typed);
    const markdown =
      renderBugReportPreviewMarkdown(
        preview,
        "standard",
      );

    expect(markdown).toContain(
      "## Design Mismatches",
    );
    expect(markdown).not.toContain("## Bugs");
  });

  it("keeps solution grounded in Suggested Fix", () => {
    const preview = projectBugReportPreview(report(), {
      mode: "summary",
    });

    expect(preview.bugs[0]?.solution).toBe(
      "Clear stale session ownership during cleanup.",
    );
    expect(preview.bugs[0]?.bugTrigger).toEqual([
      "Finish a match.",
      "Return to the lobby.",
      "Start the same arena again.",
      "Confirm the new match does not start.",
    ]);
  });

  it("keeps technical context out of standard preview", () => {
    const standard = projectBugReportPreview(report(), {
      mode: "standard",
    });
    const full = projectBugReportPreview(report(), {
      mode: "full",
    });

    expect(standard.bugs[0]?.technicalAnalysis).toBeUndefined();
    expect(full.bugs[0]?.technicalAnalysis).toContain(
      "Root Cause",
    );
  });

  it("renders issue before evidence and technical context", () => {
    const preview = projectBugReportPreview(report(), {
      mode: "full",
    });
    const markdown = renderBugReportPreviewMarkdown(preview, "full");

    expect(markdown).toContain("## Bugs");
    expect(markdown).toContain("| # | Severity | Category | Issue |");
    expect(markdown).toContain("#### [BLOCKER] BUG-001 — Match cannot restart");

    expect(markdown).not.toContain("Work Checklist");
    expect(markdown).not.toContain("☐");
    expect(markdown).not.toContain("- [ ]");
    expect(markdown).not.toContain("Minecraft Education 1.26.32");
    expect(markdown).toContain(
      "**Technical Analysis:**\nRoot Cause\nCleanup leaves stale session ownership.",
    );

    expect(markdown.indexOf("**Issue:**")).toBeLessThan(
      markdown.indexOf("**Observed:**"),
    );
    expect(markdown.indexOf("**Expected:**")).toBeLessThan(
      markdown.indexOf("**Technical Analysis:**"),
    );
  });
});
