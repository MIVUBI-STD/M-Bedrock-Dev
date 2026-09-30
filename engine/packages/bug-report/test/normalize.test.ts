import { describe, expect, it } from "vitest";
import {
  BUG_REPORT_SCHEMA,
  normalizeBugReportV1,
  type BugReportBug,
  type BugReportV1,
} from "../src/index.js";

function bug(title: string, severity: BugReportBug["severity"]): BugReportBug {
  return {
    title,
    severity,
    foundBy: "tester",
    verification: "observed",
    problem: "A gameplay defect is visible.",
    expected: "The intended gameplay rule is preserved.",
    observed: {
      gameplay: "The observed gameplay behavior differs.",
    },
  };
}

function report(): BugReportV1 {
  return {
    schema: BUG_REPORT_SCHEMA,
    map: {
      name: "Blitz Build",
      version: "1.0.3",
      minecraftVersion: "1.26.32",
      drive: "https://drive.google.com/file/d/map/view",
    },
    bugFinders: [
      {
        category: "ui-feedback",
        bugs: [
          bug("Z message", "minor"),
          bug("A message", "minor"),
        ],
      },
      {
        category: "game-flow",
        bugs: [
          bug("Minor flow issue", "minor"),
          bug("Major flow issue", "major"),
          bug("Blocked restart", "blocker"),
        ],
      },
      {
        category: "world-interaction",
        bugs: [
          bug("Water boundary", "major"),
        ],
      },
    ],
  };
}

describe("bug report canonical normalization", () => {
  it("orders finders by canonical domain order", () => {
    const normalized = normalizeBugReportV1(report());
    expect(normalized.bugFinders.map((finder) => finder.category)).toEqual([
      "game-flow",
      "world-interaction",
      "ui-feedback",
    ]);
  });

  it("orders bugs by severity then title", () => {
    const normalized = normalizeBugReportV1(report());
    expect(normalized.bugFinders[0]?.bugs.map((entry) => entry.title)).toEqual([
      "Blocked restart",
      "Major flow issue",
      "Minor flow issue",
    ]);
    expect(normalized.bugFinders[2]?.bugs.map((entry) => entry.title)).toEqual([
      "A message",
      "Z message",
    ]);
  });

  it("does not reorder authored reproduction and validation steps", () => {
    const source = report();
    const modified: BugReportV1 = {
      ...source,
      bugFinders: source.bugFinders.map((finder) =>
        finder.category === "game-flow"
          ? {
              ...finder,
              bugs: finder.bugs.map((entry) =>
                entry.title === "Minor flow issue"
                  ? {
                      ...entry,
                      reproduction: [
                        "second-dependent step 1",
                        "second-dependent step 2",
                      ],
                      fixValidation: [
                        "validation step 1",
                        "validation step 2",
                      ],
                    }
                  : entry,
              ),
            }
          : finder,
      ),
    };

    const normalized = normalizeBugReportV1(modified);
    const normalizedBug = normalized.bugFinders
      .find((finder) => finder.category === "game-flow")
      ?.bugs.find((entry) => entry.title === "Minor flow issue");

    expect(normalizedBug?.reproduction).toEqual([
      "second-dependent step 1",
      "second-dependent step 2",
    ]);
    expect(normalizedBug?.fixValidation).toEqual([
      "validation step 1",
      "validation step 2",
    ]);
  });

  it("does not mutate the source report ordering", () => {
    const source = report();
    normalizeBugReportV1(source);
    expect(source.bugFinders[0]?.category).toBe("ui-feedback");
    expect(source.bugFinders[0]?.bugs[0]?.title).toBe("Z message");
  });
});
