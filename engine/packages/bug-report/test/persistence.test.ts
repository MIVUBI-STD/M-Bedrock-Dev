import {
  describe,
  expect,
  it,
} from "vitest";
import {
  BUG_REPORT_WORKSPACE_DIRECTORY,
  buildBugReportFileName,
  buildBugReportWorkspacePath,
} from "../src/index.js";

const map = {
  name: "Beach Bedwars",
  mapVersion: "1.0.4",
  drive: "https://drive.google.com/file/d/map/view",
  baseVersion: "1.26.20",
  testedVersion: "1.26.32",
};

describe("bug report persistence contract", () => {
  it("keeps canonical workspace directory stable", () => {
    expect(BUG_REPORT_WORKSPACE_DIRECTORY)
      .toBe("workspace/reports");
  });

  it("builds one canonical filename and workspace path", () => {
    expect(buildBugReportFileName(map))
      .toBe("Beach-Bedwars-v1.0.4-BugReport.json");
    expect(buildBugReportWorkspacePath(map))
      .toBe(
        "workspace/reports/Beach-Bedwars-v1.0.4-BugReport.json",
      );
  });
});
