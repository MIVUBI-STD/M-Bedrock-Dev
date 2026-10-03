import { describe, expect, it } from "vitest";
import {
  approveProject,
  applyDrivePublishReceipt,
  assessProjectApprovalReadiness,
  buildProjectDrivePublishPlan,
  createDrivePublishReceipt,
  createProjectApprovalSnapshot,
  createProjectRecord,
  updateProjectRecord,
} from "../src/workflow/index.js";

function baseProject() {
  return createProjectRecord({
    projectId: "defense-v2",
    projectName: "Defense V2",
    taskClass: "DIAGNOSE",
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
    drive: {
      schemaVersion: 1,
      projectId: "defense-v2",
      mapFolder: {
        folderId: "drive-folder-1",
      },
    },
  });
}

const deliverables = [{
  kind: "map-audit-report" as const,
  path:
    "workspace/projects/defense-v2/output/audit.html",
  fingerprint: "sha256:audit",
  destinationRole:
    "project-root" as const,
}, {
  kind: "bug-report" as const,
  path:
    "workspace/reports/Defense-v2.0.0-BugReport.json",
  fingerprint: "sha256:report",
  destinationRole:
    "project-root" as const,
}];

function projectWithReport() {
  return updateProjectRecord(
    baseProject(),
    {
      bugReportPath:
        "workspace/reports/Defense-v2.0.0-BugReport.json",
    },
  );
}

function approvedProject() {
  const project = projectWithReport();
  const snapshot =
    createProjectApprovalSnapshot({
      project,
      deliverables,
      requireAuditComplete: true,
      requireBugReport: true,
    });
  return {
    project:
      approveProject(
        project,
        snapshot,
      ),
    snapshot,
  };
}

describe("project publication lifecycle", () => {
  it("derives readiness without persisting another status", () => {
    const project = projectWithReport();
    const readiness =
      assessProjectApprovalReadiness({
        project,
        deliverables,
        requireAuditComplete: true,
        requireBugReport: true,
      });

    expect(readiness.ready).toBe(true);
    expect(readiness.missing).toEqual([]);
    expect(project.status).toBe("working");
  });

  it("invalidates approval when material project work changes", () => {
    const approved =
      approvedProject().project;

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

  it("rejects a forged approval snapshot fingerprint", () => {
    const project = projectWithReport();
    const snapshot =
      createProjectApprovalSnapshot({
        project,
        deliverables,
        requireAuditComplete: true,
        requireBugReport: true,
      });

    expect(() =>
      approveProject(
        project,
        {
          ...snapshot,
          snapshotFingerprint:
            "sha256:forged",
        },
      )
    ).toThrow(
      "Project approval snapshot fingerprint is invalid.",
    );
  });

  it("requires approved state before Drive publication", () => {
    const project = projectWithReport();
    const snapshot =
      createProjectApprovalSnapshot({
        project,
        deliverables,
        requireAuditComplete: true,
        requireBugReport: true,
      });

    expect(() =>
      buildProjectDrivePublishPlan({
        project,
        snapshot,
      })
    ).toThrow(
      "Drive publish plan requires project status approved.",
    );
  });

  it("does not mark a partial Drive upload as published", () => {
    const {
      project,
      snapshot,
    } = approvedProject();

    const receipt =
      createDrivePublishReceipt({
        project,
        snapshot,
        files: [{
          kind: "bug-report",
          destinationRole:
            "project-root",
          fileId: "drive-report",
          fileName:
            "Defense - Bug Report.pdf",
          fingerprint:
            "sha256:report",
        }],
      });

    expect(receipt.status)
      .toBe("PARTIAL");
    expect(() =>
      applyDrivePublishReceipt(
        project,
        receipt,
      )
    ).toThrow(
      "Partial Drive publication cannot mark project drive-published.",
    );
  });

  it("marks the exact approved deliverables as drive-published", () => {
    const {
      project,
      snapshot,
    } = approvedProject();

    const receipt =
      createDrivePublishReceipt({
        project,
        snapshot,
        files: [{
          kind: "bug-report",
          destinationRole:
            "project-root",
          fileId: "drive-report",
          fileName:
            "Defense - Bug Report.pdf",
          fingerprint:
            "sha256:report",
        }, {
          kind: "map-audit-report",
          destinationRole:
            "project-root",
          fileId: "drive-audit",
          fileName:
            "Defense - Map Audit.html",
          fingerprint:
            "sha256:audit",
        }],
      });

    expect(receipt.status)
      .toBe("COMPLETE");
    expect(
      applyDrivePublishReceipt(
        project,
        receipt,
      ).status,
    ).toBe("drive-published");
  });
});
