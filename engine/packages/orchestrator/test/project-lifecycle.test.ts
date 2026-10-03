import { describe, expect, it } from "vitest";
import {
  approveProject,
  applyDrivePublishReceipt,
  assessProjectApprovalReadiness,
  buildProjectDrivePublishPlan,
  createDrivePublishReceipt,
  createProjectApprovalSnapshot,
  createProjectRecord,
  markProjectReadyForApproval,
  updateProjectRecord,
} from "../src/workflow/index.js";

function baseProject() {
  return createProjectRecord({
    projectId: "defense-v2",
    projectName: "Defense V2",
    taskClass: "AUDIT",
    artifact: {
      artifactId: "map:defense-v2",
      artifactFingerprint: "sha256:map",
      version: "2.0.0",
    },
    work: {
      sessionId: "session:1",
      workSessionRevision: 4,
      auditRevision: "audit:4",
      currentStage: "COMPLETE",
      nextAction: "PREPARE_REVIEW",
    },
    driveFolderId: "drive-folder-1",
  });
}

const deliverables = [{
  kind: "map-audit-report" as const,
  path: "workspace/projects/defense-v2/output/audit.html",
  fingerprint: "sha256:audit",
}, {
  kind: "bug-report" as const,
  path: "workspace/reports/Defense-v2.0.0-BugReport.json",
  fingerprint: "sha256:report",
}];

describe("project publication lifecycle", () => {
  it("gates approval on complete project evidence", () => {
    const project = updateProjectRecord(
      baseProject(),
      {
        bugReportPath:
          "workspace/reports/Defense-v2.0.0-BugReport.json",
      },
    );
    const readiness =
      assessProjectApprovalReadiness({
        project,
        deliverables,
        requireAuditComplete: true,
        requireBugReport: true,
      });

    expect(readiness.ready).toBe(true);
    expect(readiness.missing).toEqual([]);
  });

  it("invalidates approval when material project work changes", () => {
    const prepared =
      markProjectReadyForApproval(
        updateProjectRecord(baseProject(), {
          bugReportPath:
            "workspace/reports/Defense-v2.0.0-BugReport.json",
        }),
        { ready: true, missing: [] },
      );
    const snapshot =
      createProjectApprovalSnapshot({
        project: prepared,
        deliverables,
      });
    const approved =
      approveProject(prepared, snapshot);

    const changed =
      updateProjectRecord(approved, {
        artifact: {
          ...approved.artifact,
          artifactFingerprint:
            "sha256:changed-map",
        },
      });

    expect(changed.status).toBe("working");
    expect(
      changed.publication
        .approvalSnapshotFingerprint,
    ).toBeUndefined();
  });

  it("requires approved snapshot before Drive publication", () => {
    const project = updateProjectRecord(
      baseProject(),
      {
        bugReportPath:
          "workspace/reports/Defense-v2.0.0-BugReport.json",
      },
    );

    expect(() =>
      buildProjectDrivePublishPlan({
        project,
        snapshot: {
          schemaVersion: 1,
          projectId: project.projectId,
          projectRevision: project.revision,
          artifactFingerprint:
            project.artifact.artifactFingerprint,
          bugReportPath:
            project.knowledge.bugReportPath,
          deliverables,
          historicalRegressionIds: [],
          snapshotFingerprint:
            "sha256:snapshot",
        },
      })
    ).toThrow(
      "Drive publish plan requires project status approved.",
    );
  });

  it("does not mark a partial Drive upload as published", () => {
    const prepared =
      markProjectReadyForApproval(
        updateProjectRecord(baseProject(), {
          bugReportPath:
            "workspace/reports/Defense-v2.0.0-BugReport.json",
        }),
        { ready: true, missing: [] },
      );
    const snapshot =
      createProjectApprovalSnapshot({
        project: prepared,
        deliverables,
      });
    const approved =
      approveProject(prepared, snapshot);

    const receipt =
      createDrivePublishReceipt({
        project: approved,
        snapshot,
        files: [{
          kind: "bug-report",
          fileId: "drive-report",
          fileName: "Defense - Bug Report.pdf",
          fingerprint: "sha256:report",
        }],
      });

    expect(receipt.status).toBe("PARTIAL");
    expect(() =>
      applyDrivePublishReceipt(
        approved,
        receipt,
      )
    ).toThrow(
      "Partial Drive publication cannot mark project drive-published.",
    );
  });

  it("marks complete approved deliverables as drive-published", () => {
    const prepared =
      markProjectReadyForApproval(
        updateProjectRecord(baseProject(), {
          bugReportPath:
            "workspace/reports/Defense-v2.0.0-BugReport.json",
        }),
        { ready: true, missing: [] },
      );
    const snapshot =
      createProjectApprovalSnapshot({
        project: prepared,
        deliverables,
      });
    const approved =
      approveProject(prepared, snapshot);

    const receipt =
      createDrivePublishReceipt({
        project: approved,
        snapshot,
        files: [{
          kind: "bug-report",
          fileId: "drive-report",
          fileName: "Defense - Bug Report.pdf",
          fingerprint: "sha256:report",
        }, {
          kind: "map-audit-report",
          fileId: "drive-audit",
          fileName: "Defense - Map Audit.html",
          fingerprint: "sha256:audit",
        }],
      });

    expect(receipt.status).toBe("COMPLETE");
    expect(
      applyDrivePublishReceipt(
        approved,
        receipt,
      ).status,
    ).toBe("drive-published");
  });
});
