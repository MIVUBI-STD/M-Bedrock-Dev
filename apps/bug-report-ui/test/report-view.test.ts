import {
  describe,
  expect,
  it,
} from "vitest";
import type {
  BugReportV2,
  BugReportV2Bug,
} from "../../../engine/packages/bug-report/src/index.js";
import {
  filterBugReportBugs,
} from "../src/report-view.js";

function bug(
  index: number,
  options: {
    fixed?: boolean;
    severity?: "blocker" | "major" | "minor";
  } = {},
): BugReportV2Bug {
  return {
    id: "BUG-" + String(index).padStart(3, "0"),
    fixed: options.fixed ?? false,
    severity: options.severity ?? "major",
    category: "game-flow",
    foundBy: "ai",
    title: "Gameplay issue " + String(index),
    problem: "Problem " + String(index),
    expected: "Expected " + String(index),
    observed: "Observed " + String(index),
    reproduction: [
      "Enter arena " + String(index) + ".",
      "Confirm the gameplay issue is visible.",
    ],
    suggestedFix: "Reset the affected gameplay state.",
  };
}

function report(
  count: number,
  fixed: readonly number[] = [],
): BugReportV2 {
  return {
    schema: "m-bedrock-bug-report/v2",
    map: {
      name: "Scale Test",
      mapVersion: "1.0.0",
      drive: "https://drive.google.com/file/d/map/view",
      baseVersion: "1.26.20",
      testedVersion: "1.26.32",
    },
    repairBy: "developer",
    bugs: Array.from(
      { length: count },
      (_, index) =>
        bug(index + 1, {
          fixed: fixed.includes(index + 1),
          severity:
            index === 0
              ? "blocker"
              : index % 3 === 0
                ? "minor"
                : "major",
        }),
    ),
  };
}

describe("bug report view behavior", () => {
  it.each([5, 10, 24])(
    "keeps unfinished work focused for a %i-bug report",
    (count) => {
      const value = report(count, [2, 3]);
      const visible = filterBugReportBugs(
        value.bugs,
        {
          severity: "all",
          query: "",
        },
      );

      expect(visible).toHaveLength(count - 2);
      expect(visible.some((item) => item.fixed)).toBe(false);
    },
  );

  it("searches tester-facing trigger and solution copy", () => {
    const value = report(5);

    const byTrigger = filterBugReportBugs(
      value.bugs,
      {
        view: "not-fixed",
        severity: "all",
        query: "arena 3",
      },
    );
    expect(byTrigger.map((item) => item.id)).toEqual([
      "BUG-003",
    ]);

    const bySolution = filterBugReportBugs(
      value.bugs,
      {
        view: "not-fixed",
        severity: "all",
        query: "reset the affected gameplay state",
      },
    );
    expect(bySolution).toHaveLength(5);
  });

  it("combines state, severity, and search without changing report data", () => {
    const value = report(24, [2, 3, 4]);
    const visible = filterBugReportBugs(
      value.bugs,
      {
        view: "not-fixed",
        severity: "blocker",
        query: "gameplay issue",
      },
    );

    expect(visible.map((item) => item.id)).toEqual([
      "BUG-001",
    ]);
    expect(value.bugs).toHaveLength(24);
  });
});
