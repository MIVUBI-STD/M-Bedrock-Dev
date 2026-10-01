import { describe, expect, it } from "vitest";
import {
  buildBugReportClientLayoutPlan,
  projectBugReportClientDocument,
  type BugReportV2,
} from "../src/index.js";

function report(count: number): BugReportV2 {
  return {
    schema: "m-bedrock-bug-report/v2",
    map: {
      name: "Layout Map",
      mapVersion: "1.0.0",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer",
    bugs: Array.from({ length: count }, (_, index) => ({
      id: "BUG-LAYOUT-" + String(index + 1),
      fixed: false,
      severity:
        index === 0
          ? "blocker" as const
          : index % 2 === 0
            ? "minor" as const
            : "major" as const,
      category: "game-flow" as const,
      foundBy: "tester" as const,
      title: "Issue " + String(index + 1),
      problem:
        "Gameplay issue " + String(index + 1) + " affects the current run.",
      expected:
        "The gameplay step completes normally.",
      observed:
        "The gameplay step does not complete normally.",
      reproduction: [
        "Start the affected gameplay.",
        "Perform the affected action.",
        "Confirm the wrong result is visible.",
      ],
    })),
  };
}

describe("client document table-first layout", () => {
  it("does not duplicate a short report with an issue index", () => {
    const document =
      projectBugReportClientDocument(report(3));
    const layout =
      buildBugReportClientLayoutPlan(document);

    expect(layout.showIssueIndex).toBe(false);
    expect(layout.showSeverityLegend).toBe(true);
    expect(layout.compactTables).toBe(false);
  });

  it("uses compact issue tables from four issues onward", () => {
    const document =
      projectBugReportClientDocument(report(4));

    expect(
      buildBugReportClientLayoutPlan(document)
        .compactTables,
    ).toBe(true);
  });

  it("adds a separate index only for large reports", () => {
    const six =
      projectBugReportClientDocument(report(6));
    const seven =
      projectBugReportClientDocument(report(7));

    expect(
      buildBugReportClientLayoutPlan(six)
        .showIssueIndex,
    ).toBe(false);
    expect(
      buildBugReportClientLayoutPlan(seven)
        .showIssueIndex,
    ).toBe(true);
  });
});
