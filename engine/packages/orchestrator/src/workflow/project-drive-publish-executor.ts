import type {
  DrivePublishedFile,
} from "../../../project-model/src/index.js";
import type {
  ProjectDrivePublishPlan,
  ProjectDrivePublishPlanItem,
} from "./project-drive-publish-plan.js";

export interface ProjectDriveUploadAdapter {
  readonly upload: (
    item: ProjectDrivePublishPlanItem,
  ) => Promise<{
    readonly fileId: string;
    readonly fileName: string;
    readonly fingerprint: string;
  }>;
}

export interface ProjectDrivePublishExecution {
  readonly projectId: string;
  readonly snapshotFingerprint: string;
  readonly files: readonly DrivePublishedFile[];
  readonly failed: readonly {
    readonly item: ProjectDrivePublishPlanItem;
    readonly reason: string;
  }[];
}

function errorMessage(error: unknown): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message.trim();
  }
  return String(error);
}

export async function executeProjectDrivePublishPlan(
  plan: ProjectDrivePublishPlan,
  adapter: ProjectDriveUploadAdapter,
): Promise<ProjectDrivePublishExecution> {
  const files: DrivePublishedFile[] = [];
  const failed:
    ProjectDrivePublishExecution["failed"][number][] = [];

  for (const item of plan.items) {
    try {
      const uploaded =
        await adapter.upload(item);

      if (
        uploaded.fingerprint !==
          item.fingerprint
      ) {
        failed.push({
          item,
          reason:
            "Uploaded file fingerprint does not match the approved snapshot.",
        });
        continue;
      }
      if (
        !uploaded.fileId.trim() ||
        !uploaded.fileName.trim()
      ) {
        failed.push({
          item,
          reason:
            "Drive upload returned incomplete file identity.",
        });
        continue;
      }

      files.push({
        kind: item.kind,
        destinationRole:
          item.destinationRole,
        fileId: uploaded.fileId.trim(),
        fileName: uploaded.fileName.trim(),
        fingerprint:
          uploaded.fingerprint,
      });
    } catch (error) {
      failed.push({
        item,
        reason: errorMessage(error),
      });
    }
  }

  return {
    projectId: plan.projectId,
    snapshotFingerprint:
      plan.snapshotFingerprint,
    files,
    failed,
  };
}
