import type {
  DriveProjectBinding,
  ProjectApprovalSnapshot,
  ProjectDriveDestinationRole,
  ProjectRecord,
} from "../../../project-model/src/index.js";
import {
  validateProjectApprovalSnapshot,
} from "./project-lifecycle.js";

export interface ProjectDrivePublishPlanItem {
  readonly kind:
    ProjectApprovalSnapshot["deliverables"][number]["kind"];
  readonly destinationRole:
    ProjectDriveDestinationRole;
  readonly sourcePath: string;
  readonly fingerprint: string;
  readonly destinationFolderId: string;
}

export interface ProjectDrivePublishPlan {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly snapshotFingerprint: string;
  readonly items:
    readonly ProjectDrivePublishPlanItem[];
}

export function resolveDriveDestinationFolderId(
  binding: DriveProjectBinding,
  role: ProjectDriveDestinationRole,
): string {
  switch (role) {
    case "project-root":
      return binding.mapFolder.folderId;
    case "development-source": {
      const folder =
        binding.folders
          ?.developmentSource;
      if (folder === undefined) {
        throw new Error(
          "Drive project binding is missing Development/Source folder.",
        );
      }
      return folder.folderId;
    }
    case "development-version": {
      const folder =
        binding.folders
          ?.developmentVersions;
      if (folder === undefined) {
        throw new Error(
          "Drive project binding is missing Development/Versions folder.",
        );
      }
      return folder.folderId;
    }
    case "technical-docs": {
      const folder =
        binding.folders
          ?.technicalDocs;
      if (folder === undefined) {
        throw new Error(
          "Drive project binding is missing Technical Docs folder.",
        );
      }
      return folder.folderId;
    }
  }
}

export function buildProjectDrivePublishPlan(
  input: {
    readonly project: ProjectRecord;
    readonly snapshot:
      ProjectApprovalSnapshot;
  },
): ProjectDrivePublishPlan {
  const snapshotIssues =
    validateProjectApprovalSnapshot(
      input.snapshot,
    );
  if (snapshotIssues.length > 0) {
    throw new Error(
      snapshotIssues.join("; "),
    );
  }
  if (
    input.project.status !== "approved"
  ) {
    throw new Error(
      "Drive publish plan requires project status approved.",
    );
  }
  if (
    input.project.publication
      .approvalSnapshotFingerprint !==
      input.snapshot
        .snapshotFingerprint
  ) {
    throw new Error(
      "Drive publish plan snapshot does not match the current approved project.",
    );
  }

  const binding =
    input.project.publication.drive;
  if (binding === undefined) {
    throw new Error(
      "Drive publish plan requires the canonical project Drive binding.",
    );
  }
  if (
    binding.projectId !==
      input.project.projectId
  ) {
    throw new Error(
      "Drive project binding belongs to another projectId.",
    );
  }

  return {
    schemaVersion: 1,
    projectId:
      input.project.projectId,
    snapshotFingerprint:
      input.snapshot
        .snapshotFingerprint,
    items:
      input.snapshot.deliverables
        .map((item) => ({
          kind: item.kind,
          destinationRole:
            item.destinationRole,
          sourcePath: item.path,
          fingerprint:
            item.fingerprint,
          destinationFolderId:
            resolveDriveDestinationFolderId(
              binding,
              item.destinationRole,
            ),
        }))
        .sort(
          (a, b) =>
            a.destinationRole
              .localeCompare(
                b.destinationRole,
              ) ||
            a.kind.localeCompare(b.kind) ||
            a.sourcePath.localeCompare(
              b.sourcePath,
            ),
        ),
  };
}
