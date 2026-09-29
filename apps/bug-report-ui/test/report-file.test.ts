import { describe, expect, it } from "vitest";
import {
  buildBugReportDownloadName,
  readBugReportFile,
} from "../src/report-file.js";

const valid = JSON.stringify({
  schema: "m-bedrock-bug-report/v1",
  map: {
    name: "Blitz Build",
    version: "1.0.3",
    minecraftVersion: "1.26.32",
    drive: "https://drive.google.com/file/d/map/view",
  },
  bugFinders: [],
});

describe("review UI bug report file boundary", () => {
  it("accepts a valid JSON report", async () => {
    const result = await readBugReportFile({
      name: "report.json",
      async text() {
        return valid;
      },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects non-JSON uploads before parsing", async () => {
    const result = await readBugReportFile({
      name: "map.mcworld",
      async text() {
        return valid;
      },
    });
    expect(result.ok).toBe(false);
  });

  it("creates a stable export filename from required map identity", () => {
    expect(
      buildBugReportDownloadName({
        name: "Blitz Build",
        version: "1.0.3",
        minecraftVersion: "1.26.32",
        drive: "https://drive.google.com/file/d/map/view",
      }),
    ).toBe("Blitz-Build-v1.0.3-BugReport.json");
  });
});
