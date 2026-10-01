import {
  readFile,
} from "node:fs/promises";
import {
  fileURLToPath,
} from "node:url";
import {
  describe,
  expect,
  it,
} from "vitest";
import {
  parseBugReportV2Json,
  reviewBugReportCopy,
  reviewBugReportReadiness,
} from "../src/index.js";

const fixturePath = fileURLToPath(
  new URL(
    "../fixtures/golden-tester-report-v2.json",
    import.meta.url,
  ),
);

describe("golden tester report", () => {
  it("remains schema-valid, tester-ready, and copy-ready", async () => {
    const source = await readFile(fixturePath, "utf8");
    const parsed = parseBugReportV2Json(source);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(
      reviewBugReportReadiness(parsed.report.bugs),
    ).toEqual([]);
    expect(
      reviewBugReportCopy(parsed.report.bugs),
    ).toEqual([]);

    expect(
      parsed.report.bugs.map((bug) => bug.severity),
    ).toEqual([
      "blocker",
      "major",
      "minor",
    ]);
  });
});
