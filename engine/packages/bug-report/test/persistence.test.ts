import { describe, expect, it } from "vitest";
import { BUG_REPORT_WORKSPACE_DIRECTORY, buildBugReportWorkspacePath } from "../src/index.js";

describe("project-scoped bug report paths", () => {
  it("builds canonical single-level and multi-level report paths", () => {
    expect(BUG_REPORT_WORKSPACE_DIRECTORY).toBe("workspace/projects");
    expect(buildBugReportWorkspacePath("attack-challenge")).toBe(
      "workspace/projects/attack-challenge/report/bug-report.json");
    expect(buildBugReportWorkspacePath("fall-of-the-pillager", "level-2")).toBe(
      "workspace/projects/fall-of-the-pillager/levels/level-2/report/bug-report.json");
  });
  it("rejects traversal and noncanonical level identifiers", () => {
    expect(() => buildBugReportWorkspacePath("../other")).toThrow();
    expect(() => buildBugReportWorkspacePath("attack-challenge", "other")).toThrow();
  });
});
