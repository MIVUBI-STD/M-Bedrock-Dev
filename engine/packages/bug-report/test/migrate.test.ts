import {
  describe,
  expect,
  it,
} from "vitest";
import {
  parseBugReportToCurrent,
} from "../src/index.js";

describe("bug report migration boundary", () => {
  it("normalizes legacy V1 input to canonical V2", () => {
    const result = parseBugReportToCurrent(JSON.stringify({
      schema: "m-bedrock-bug-report/v1",
      map: {
        name: "Legacy Map",
        version: "1.2.3",
        minecraftVersion: "1.26.32",
        drive: "https://drive.google.com/file/d/map/view",
      },
      bugFinders: [],
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.schema).toBe("m-bedrock-bug-report/v2");
    expect(result.report.map).toMatchObject({
      name: "Legacy Map",
      mapVersion: "1.2.3",
      baseVersion: "1.26.32",
      testedVersion: "1.26.32",
    });
  });

  it("keeps canonical V2 input canonical", () => {
    const result = parseBugReportToCurrent(JSON.stringify({
      schema: "m-bedrock-bug-report/v2",
      map: {
        name: "Current Map",
        mapVersion: "2.0.0",
        drive: "https://drive.google.com/file/d/map/view",
        baseVersion: "1.26.20",
        testedVersion: "1.26.32",
      },
      repairBy: "developer",
      bugs: [{
        id: "BUG-001",
        fixed: false,
        severity: "major",
        category: "game-flow",
        foundBy: "tester",
        title: "Progress cannot continue",
        problem: "The player cannot continue after the objective completes.",
        expected: "The next objective becomes available.",
        observed: "The next objective remains unavailable.",
      }],
    }));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.report.map.mapVersion).toBe("2.0.0");
  });
});
