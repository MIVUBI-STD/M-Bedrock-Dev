import { describe, expect, it } from "vitest";
import {
  executeProjectDrivePublishPlan,
} from "../src/workflow/project-drive-publish-executor.js";

describe("project Drive publish executor", () => {
  it("records fingerprint mismatch as failed instead of published", async () => {
    const result =
      await executeProjectDrivePublishPlan(
        {
          schemaVersion: 1,
          projectId: "defense-v2",
          snapshotFingerprint:
            "sha256:snapshot",
          destinationFolderId:
            "drive-folder",
          items: [{
            kind: "bug-report",
            sourcePath:
              "workspace/reports/report.json",
            fingerprint:
              "sha256:approved",
            destinationFolderId:
              "drive-folder",
          }],
        },
        {
          upload: async () => ({
            fileId: "file-1",
            fileName: "report.json",
            fingerprint:
              "sha256:different",
          }),
        },
      );

    expect(result.files).toEqual([]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.reason)
      .toContain("fingerprint");
  });

  it("returns verified uploaded files for receipt creation", async () => {
    const result =
      await executeProjectDrivePublishPlan(
        {
          schemaVersion: 1,
          projectId: "defense-v2",
          snapshotFingerprint:
            "sha256:snapshot",
          destinationFolderId:
            "drive-folder",
          items: [{
            kind: "map-audit-report",
            sourcePath:
              "workspace/projects/defense-v2/output/audit.html",
            fingerprint:
              "sha256:audit",
            destinationFolderId:
              "drive-folder",
          }],
        },
        {
          upload: async () => ({
            fileId: "file-audit",
            fileName: "audit.html",
            fingerprint:
              "sha256:audit",
          }),
        },
      );

    expect(result.failed).toEqual([]);
    expect(result.files).toEqual([{
      kind: "map-audit-report",
      fileId: "file-audit",
      fileName: "audit.html",
      fingerprint: "sha256:audit",
    }]);
  });
});
