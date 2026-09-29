import {
  describe,
  expect,
  it,
} from "vitest";
import {
  createBugReportV2,
} from "../src/index.js";

describe("createBugReportV2", () => {
  it("creates the canonical report with bugs not fixed by default", () => {
    const report = createBugReportV2({
      map: {
        name: "Beach Bedwars",
        mapVersion: "1.0.4",
        baseVersion: "1.26.20",
        testedVersion: "1.26.32",
      },
      repairBy: "developer",
      bugs: [{
        id: "BUG-BBW-001",
        severity: "major",
        category: "multiplayer-session",
        foundBy: "ai",
        title: "Reconnect loses arena state",
        problem: "Arena state is stale after reconnect.",
        expected: "The player rejoins the same arena cleanly.",
        observed: "The previous membership remains active.",
        aiAnalysis: "The reconnect path keeps stale arena membership.",
        suggestedFix: "Rebind arena membership to the new session.",
      }],
    });

    expect(report.schema).toBe("m-bedrock-bug-report/v2");
    expect(report.bugs[0]?.fixed).toBe(false);
    expect(report.repairBy).toBe("developer");
  });

  it("rejects invalid reports at creation time", () => {
    expect(() =>
      createBugReportV2({
        map: {
          name: "Beach Bedwars",
          mapVersion: "1.0.4",
          baseVersion: "1.26.20",
          testedVersion: "",
        },
        repairBy: "developer",
        bugs: [{
          id: "BUG-BBW-001",
          severity: "major",
          category: "multiplayer-session",
          foundBy: "ai",
          title: "Reconnect loses arena state",
          problem: "Arena state is stale after reconnect.",
          expected: "The player rejoins the same arena cleanly.",
          observed: "The previous membership remains active.",
        }],
      })
    ).toThrow(/creation failed/);
  });
});
