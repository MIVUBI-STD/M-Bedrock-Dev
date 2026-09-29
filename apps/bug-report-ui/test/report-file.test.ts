import {
  describe,
  expect,
  it,
} from "vitest";
import {
  buildBugReportDownloadName,
  readBugReportFile,
} from "../src/report-file.js";

const validV2 = JSON.stringify({
  schema: "m-bedrock-bug-report/v2",
  map: {
    name: "Beach Bedwars",
    mapVersion: "1.0.4",
    baseVersion: "1.26.20",
    testedVersion: "1.26.32",
  },
  repairBy: "developer",
  bugs: [{
    id: "BUG-BBW-001",
    fixed: false,
    severity: "major",
    category: "multiplayer-session",
    foundBy: "ai",
    title: "Reconnect loses arena state",
    problem: "Arena state is stale after reconnect.",
    expected: "The player rejoins the same arena cleanly.",
    observed: "The previous membership remains active.",
  }],
});

const validV1 = JSON.stringify({
  schema: "m-bedrock-bug-report/v1",
  map: {
    name: "Blitz Build",
    version: "1.0.3",
    minecraftVersion: "1.26.32",
    drive: "https://drive.google.com/file/d/map/view",
  },
  bugFinders: [],
});

describe("bug report file boundary", () => {
  it("accepts a V2 report", async () => {
    const result = await readBugReportFile({
      name: "report.json",
      async text() {
        return validV2;
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.map.baseVersion).toBe("1.26.20");
  });

  it("upgrades V1 reports for the V2 tracker", async () => {
    const result = await readBugReportFile({
      name: "legacy.json",
      async text() {
        return validV1;
      },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.schema).toBe("m-bedrock-bug-report/v2");
    expect(result.report.map.mapVersion).toBe("1.0.3");
  });

  it("rejects non-JSON uploads before parsing", async () => {
    const result = await readBugReportFile({
      name: "map.mcworld",
      async text() {
        return validV2;
      },
    });
    expect(result.ok).toBe(false);
  });

  it("creates a stable V2 export filename", () => {
    expect(
      buildBugReportDownloadName({
        name: "Beach Bedwars",
        mapVersion: "1.0.4",
        baseVersion: "1.26.20",
        testedVersion: "1.26.32",
      }),
    ).toBe("Beach-Bedwars-v1.0.4-BugReport.json");
  });
});
