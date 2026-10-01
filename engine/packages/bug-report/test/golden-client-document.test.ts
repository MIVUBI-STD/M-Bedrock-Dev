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
  projectBugReportClientDocument,
  reviewBugReportClientDocument,
} from "../src/index.js";

const reportFixturePath = fileURLToPath(
  new URL(
    "../fixtures/golden-tester-report-v2.json",
    import.meta.url,
  ),
);

const documentFixturePath = fileURLToPath(
  new URL(
    "../fixtures/golden-client-document-v1.json",
    import.meta.url,
  ),
);

describe("golden client document", () => {
  it("remains a deterministic projection of the golden canonical report", async () => {
    const [reportSource, expectedSource] =
      await Promise.all([
        readFile(reportFixturePath, "utf8"),
        readFile(documentFixturePath, "utf8"),
      ]);

    const parsed =
      parseBugReportV2Json(reportSource);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const document =
      projectBugReportClientDocument(
        parsed.report,
      );

    expect(
      reviewBugReportClientDocument(document),
    ).toEqual([]);
    expect(document).toEqual(
      JSON.parse(expectedSource),
    );
  });
});
