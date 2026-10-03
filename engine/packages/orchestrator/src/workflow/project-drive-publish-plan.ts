import type {
  ProjectApprovalSnapshot,
  ProjectRecord,
} from "../../../project-model/src/index.js";
import {
  validateProjectApprovalSnapshot,
} from "./project-lifecycle.js";

export interface ProjectDrivePublishPlanItem {
  readonly kind:
    ProjectApprovalSnapshot["deliverables"][number]["kind"];
  readonly sourcePath: string;
  readonly fingerprint: string;
  readonly destinationFolderId: string;
}

export interface ProjectDrivePublishPlan {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly snapshotFingerprint: string;
  readonly destinationFolderId: string;
  readonly items:
    readonly ProjectDrivePublishPlanItem[];
}

export function buildProjectDrivePublishPlan(input: {
  readonly project: ProjectRecord;
  readonly snapshot: ProjectApprovalSnapshot;
}): ProjectDrivePublishPlan {
  const snapshotIssues =
    validateProjectApprovalSnapshot(
      input.snapshot,
    );
  if (snapshotIssues.length > 0) {
    throw new Error(
      snapshotIssues.join("; "),
    );
  }

  if (input.project.status !== "approved") {
    throw new Error(
      "Drive publish plan requires project status approved.",
    );
  }
  if (
    input.project.publication
      .approvalSnapshotFingerprint !==
      input.snapshot.snapshotFingerprint
  ) {
    throw new Error(
      "Drive publish plan snapshot does not match the current approved project.",
    );
  }
  const folderId =
    input.project.publication.driveFolderId;
  if (!folderId?.trim()) {
    throw new Error(
      "Drive publish plan requires an exact project folder binding.",
    );
  }

  return {
    schemaVersion: 1,
    projectId: input.project.projectId,
    snapshotFingerprint:
      input.snapshot.snapshotFingerprint,
    destinationFolderId:
      folderId.trim(),
    items: input.snapshot.deliverables
      .map((item) => ({
        kind: item.kind,
        sourcePath: item.path,
        fingerprint: item.fingerprint,
        destinationFolderId:
          folderId.trim(),
      }))
      .sort((a, b) =>
        a.kind.localeCompare(b.kind) ||
        a.sourcePath.localeCompare(
          b.sourcePath,
        )
      ),
  };
}
