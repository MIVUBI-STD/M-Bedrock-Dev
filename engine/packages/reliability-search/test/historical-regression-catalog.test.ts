import { describe, expect, it } from "vitest";
import {
  mergeHistoricalRegressionCatalog,
  projectApprovedBugReportToHistoricalRegressions,
} from "../src/corpus/historical-regression-catalog.js";

const report: any = {
  schema: "m-bedrock-bug-report/v2",
  map: {
    name: "Defense",
    mapVersion: "2.0.0",
    drive: "https://drive.google.com/example",
    baseVersion: "2.0.0",
    testedVersion: "2.0.0",
  },
  repairBy: "developer",
  bugs: [{
    id: "BUG-001",
    fixed: false,
    severity: "major",
    category: "multiplayer-session",
    foundBy: "ai",
    title: "Arena state leaks",
    problem: "Arena-local state is shared.",
    expected: "Each arena owns isolated state.",
    observed: "Two arenas can write the same state.",
    reproduction: [
      "Start two arenas.",
      "Observe shared state.",
    ],
  }],
};

describe("historical regression catalog", () => {
  it("projects approved bugs into stable searchable history", () => {
    const records =
      projectApprovedBugReportToHistoricalRegressions({
        report,
        reportPath:
          "workspace/reports/Defense-v2.0.0-BugReport.json",
        artifactFingerprint:
          "sha256:defense",
      });

    expect(records).toHaveLength(1);
    expect(records[0]?.id)
      .toBe("reg_defense_2_0_0_bug_001");
    expect(records[0]?.domain)
      .toBe("multiplayer");
    expect(
      records[0]?.provenance.artifactFingerprint,
    ).toBe("sha256:defense");
  });

  it("preserves compatible legacy history", () => {
    const incoming =
      projectApprovedBugReportToHistoricalRegressions({
        report,
        reportPath:
          "workspace/reports/Defense-v2.0.0-BugReport.json",
        artifactFingerprint:
          "sha256:defense",
      });

    const merged =
      mergeHistoricalRegressionCatalog(
        {
          schemaVersion: 1,
          regressions: [{
            id: "legacy-regression",
            title: "Legacy issue",
            expected: "A",
            observed: "B",
          }],
        },
        incoming,
      );

    expect(
      merged.regressions.map(
        (item) => item.id,
      ),
    ).toEqual([
      "legacy-regression",
      "reg_defense_2_0_0_bug_001",
    ]);
  });

  it("rejects semantic conflict for an existing historical id", () => {
    const incoming =
      projectApprovedBugReportToHistoricalRegressions({
        report,
        reportPath:
          "workspace/reports/Defense-v2.0.0-BugReport.json",
        artifactFingerprint:
          "sha256:defense",
      });

    expect(() =>
      mergeHistoricalRegressionCatalog(
        {
          schemaVersion: 1,
          regressions: [{
            id: "reg_defense_2_0_0_bug_001",
            expected: "Different expected behavior",
            observed: "Different observed behavior",
          }],
        },
        incoming,
      )
    ).toThrow(
      "Historical regression ID semantic conflict",
    );
  });
});
