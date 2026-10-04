import {
  describe,
  expect,
  it,
} from "vitest";
import {
  BUG_REPORT_V2_SCHEMA,
  bugReportV2Progress,
  parseBugReportV2Json,
  serializeBugReportV2,
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
        id: "BUG-BBW-002",
        fixed: false,
        severity: "minor",
        category: "ui-feedback",
        foundBy: "tester",
        title: "Join feedback persists",
        problem: "Feedback remains visible after leaving.",
        expected: "Feedback clears after leaving.",
        observed: "Feedback remains visible.",
      },
      {
        id: "BUG-BBW-001",
        fixed: true,
        severity: "blocker",
        category: "game-flow",
        foundBy: "ai",
        title: "Match cannot restart",
        problem: "A completed arena cannot start again.",
        expected: "The arena can start a new match.",
        observed: "The previous session remains active.",
        reproduction: [
          "Start and finish a match normally.",
          "Return to the lobby and start the same arena again.",
          "Confirm the new match does not start.",
        ],
        aiAnalysis: "Cleanup leaves stale session ownership.",
        relevantCode: [{
          file: "scripts/session.ts",
          reason: "Owns arena session cleanup.",
        }],
        suggestedFix: "Clear stale session ownership during cleanup.",
        mustPreserve: [
          "Other arenas remain isolated.",
        ],
      },
    ],
  };
}

describe("bug report v2", () => {
  it("round-trips the canonical persisted vocabulary", () => {
    const serialized = serializeBugReportV2(report());
    expect(serialized.ok).toBe(true);
    if (!serialized.ok || !serialized.json) return;

    const parsed = parseBugReportV2Json(serialized.json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.report.map.baseVersion).toBe("1.26.20");
    expect(parsed.report.map.testedVersion).toBe("1.26.32");
    expect(parsed.report.bugs[0]?.severity).toBe("blocker");
    expect(parsed.report.bugs[0]?.issueType).toBe("BUG");
  });

  it("round-trips explicit design mismatch issue type", () => {
    const source = report();
    source.bugs[0] = {
      ...source.bugs[0]!,
      issueType: "DESIGN_MISMATCH",
    };
    const serialized = serializeBugReportV2(source);
    expect(serialized.ok).toBe(true);
    if (!serialized.ok || !serialized.json) return;
    const parsed = parseBugReportV2Json(serialized.json);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(
      parsed.report.bugs.some(
        (bug) => bug.issueType === "DESIGN_MISMATCH",
      ),
    ).toBe(true);
  });

  it("derives report progress from per-bug fixed checkboxes", () => {
    expect(bugReportV2Progress(report())).toEqual({
      fixed: 1,
      total: 2,
      allFixed: false,
    });
  });

  it("rejects per-bug repair ownership", () => {
    const source = JSON.parse(
      JSON.stringify(report()),
    ) as Record<string, unknown>;
    const bugs = source.bugs as Array<Record<string, unknown>>;
    bugs[0]!.repairBy = "chatgpt";

    const parsed = parseBugReportV2Json(JSON.stringify(source));
    expect(parsed.ok).toBe(false);
  });

  it("requires map, base, and tested versions", () => {
    const source = JSON.parse(
      JSON.stringify(report()),
    ) as {
      map: Record<string, unknown>;
    };
    delete source.map.testedVersion;

    const parsed = parseBugReportV2Json(JSON.stringify(source));
    expect(parsed.ok).toBe(false);
  });

  it("requires the canonical map Drive URL", () => {
    const missing = JSON.parse(
      JSON.stringify(report()),
    ) as {
      map: Record<string, unknown>;
    };
    delete missing.map.drive;

    const missingResult =
      parseBugReportV2Json(
        JSON.stringify(missing),
      );
    expect(missingResult.ok).toBe(false);

    const invalid = JSON.parse(
      JSON.stringify(report()),
    ) as {
      map: Record<string, unknown>;
    };
    invalid.map.drive =
      "https://example.com/map";

    const invalidResult =
      parseBugReportV2Json(
        JSON.stringify(invalid),
      );
    expect(invalidResult.ok).toBe(false);
  });

});
