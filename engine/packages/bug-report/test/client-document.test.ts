import { describe, expect, it } from "vitest";
import {
  projectBugReportClientDocument,
  reviewBugReportClientDocument,
  type BugReportV2,
} from "../src/index.js";

function report(): BugReportV2 {
  return {
    schema: "m-bedrock-bug-report/v2",
    map: {
      name: "Attack Challenge",
      mapVersion: "1.1.1",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer",
    bugs: [
      {
        id: "BUG-AC-A",
        fixed: false,
        severity: "blocker",
        category: "game-flow",
        foundBy: "tester",
        title: "Level cannot continue",
        problem:
          "The level stops after the objective and players cannot continue.",
        expected:
          "The next phase starts after the objective is completed.",
        observed:
          "The current phase remains active and the next phase never starts.",
        reproduction: [
          "Start the affected level.",
          "Complete the objective.",
          "Confirm the next phase does not start.",
        ],
        suggestedFix:
          "Advance the level state after the objective is completed.",
      },
      {
        id: "BUG-AC-B",
        fixed: false,
        severity: "major",
        category: "player-state",
        foundBy: "ai",
        title: "Inventory remains after reset",
        problem:
          "Match inventory remains after reset and affects the next run.",
        expected:
          "Match inventory is cleared before the next run begins.",
        observed:
          "Items from the previous run remain in player inventory.",
        reproduction: [
          "Finish the run with a match item in inventory.",
          "Return to the lobby.",
          "Start a new run.",
          "Confirm the previous item remains in inventory.",
        ],
        aiAnalysis:
          "Reset does not clear the match-owned inventory state.",
        relevantCode: [{
          file: "scripts/reset.ts",
          reason: "Owns match inventory cleanup.",
        }],
      },
      {
        id: "BUG-AC-C",
        fixed: true,
        severity: "minor",
        category: "ui-feedback",
        foundBy: "tester",
        title: "Old message remained visible",
        problem: "An old feedback message remained visible.",
        expected: "The message clears after the interaction ends.",
        observed: "The old message remained visible.",
        reproduction: [
          "Trigger the feedback message.",
          "Leave the interaction.",
          "Confirm the message remains visible.",
        ],
      },
    ],
  };
}

describe("client bug report document projection", () => {
  it("front-loads only open confirmed issues by default", () => {
    const document =
      projectBugReportClientDocument(report());

    expect(document.summary).toEqual(
      expect.objectContaining({
        visibleIssues: 2,
        openIssues: 2,
        fixedIssues: 1,
        blocker: 1,
        major: 1,
        minor: 0,
      }),
    );
    expect(document.issueIndex.map((item) => item.title))
      .toEqual([
        "Level cannot continue",
        "Inventory remains after reset",
      ]);
    expect(document.issues[0]).toEqual(
      expect.objectContaining({
        number: 1,
        severity: "blocker",
        issue:
          "The level stops after the objective and players cannot continue.",
        recommendedResolution:
          "Advance the level state after the objective is completed.",
      }),
    );
  });

  it("keeps implementation internals out of the client model", () => {
    const document =
      projectBugReportClientDocument(report());
    const serialized = JSON.stringify(document);

    expect(serialized).not.toContain("aiAnalysis");
    expect(serialized).not.toContain("relevantCode");
    expect(serialized).not.toContain("foundBy");
    expect(serialized).not.toContain("repairBy");
    expect(serialized).not.toContain("BUG-AC-A");
  });

  it("can intentionally include fixed issues without changing the grammar", () => {
    const document =
      projectBugReportClientDocument(report(), {
        includeFixed: true,
      });

    expect(document.summary.visibleIssues).toBe(3);
    expect(document.source.issueScope).toBe("all");
    expect(document.issues[2]?.status).toBe("fixed");
  });

  it("passes the client-document structural readability gate", () => {
    const document =
      projectBugReportClientDocument(report());

    expect(
      reviewBugReportClientDocument(document),
    ).toEqual([]);
  });

  it("detects index/detail drift", () => {
    const document =
      projectBugReportClientDocument(report());
    const broken = {
      ...document,
      issueIndex: document.issueIndex.slice(1),
    };

    expect(
      reviewBugReportClientDocument(broken)
        .map((issue) => issue.code),
    ).toContain("index-count-mismatch");
  });
});
