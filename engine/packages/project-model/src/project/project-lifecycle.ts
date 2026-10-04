import {
  normalizeDriveProjectBinding,
  type DriveProjectBinding,
} from "./drive-binding.js";

export type ProjectLifecycleStatus =
  | "working"
  | "approved"
  | "drive-published";

export type ProjectTaskClass =
  | "INSPECT"
  | "DIAGNOSE"
  | "REPAIR"
  | "MODIFY"
  | "DEVELOP"
  | "VALIDATE"
  | "RESEARCH";

export interface ProjectArtifactBinding {
  readonly artifactId: string;
  readonly artifactFingerprint: string;
  readonly version?: string;
}

export interface ProjectWorkReference {
  readonly sessionId?: string;
  readonly workSessionRevision?: number;
}

export interface ProjectKnowledgeReferences {
  readonly bugReportPath?: string;
}

export interface ProjectPublicationState {
  /**
   * Single project-level Drive binding authority.
   * Do not duplicate folder ids elsewhere in project state.
   */
  readonly drive?: DriveProjectBinding;
  readonly approvalSnapshotFingerprint?: string;
  readonly drivePublishReceiptFingerprint?: string;
}

export interface ProjectRecord {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly projectName: string;
  readonly taskClass: ProjectTaskClass;
  readonly revision: number;
  readonly artifact: ProjectArtifactBinding;
  readonly work: ProjectWorkReference;
  readonly knowledge: ProjectKnowledgeReferences;
  readonly publication: ProjectPublicationState;
}

export const PROJECT_DELIVERABLE_KINDS = [
  "map",
  "bug-report",
  "map-audit-report",
  "guide",
  "changelog",
  "other",
] as const;

export type ProjectDeliverableKind =
  (typeof PROJECT_DELIVERABLE_KINDS)[number];

export const PROJECT_DRIVE_DESTINATION_ROLES = [
  "project-root",
  "development-source",
  "development-version",
  "technical-docs",
] as const;

export type ProjectDriveDestinationRole =
  (typeof PROJECT_DRIVE_DESTINATION_ROLES)[number];

export interface ProjectDeliverableRef {
  readonly kind: ProjectDeliverableKind;
  readonly path: string;
  readonly fingerprint: string;
  readonly destinationRole: ProjectDriveDestinationRole;
}

export interface ProjectApprovalSnapshot {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly projectRevision: number;
  readonly artifactFingerprint: string;
  readonly auditRevision?: string;
  readonly bugReportPath?: string;
  readonly deliverables: readonly ProjectDeliverableRef[];
  readonly snapshotFingerprint: string;
}

export interface DrivePublishedFile {
  readonly kind: ProjectDeliverableKind;
  readonly destinationRole: ProjectDriveDestinationRole;
  readonly fileId: string;
  readonly fileName: string;
  readonly fingerprint: string;
}

export interface ProjectDrivePublishReceipt {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly snapshotFingerprint: string;
  readonly files: readonly DrivePublishedFile[];
  readonly receiptFingerprint: string;
}

export interface ProjectRegistry {
  readonly schemaVersion: 1;
  readonly projects: readonly ProjectRecord[];
}

const PROJECT_TASK_CLASSES =
  new Set<ProjectTaskClass>([
    "INSPECT",
    "DIAGNOSE",
    "REPAIR",
    "MODIFY",
    "DEVELOP",
    "VALIDATE",
    "RESEARCH",
  ]);

const DELIVERABLE_KINDS =
  new Set<ProjectDeliverableKind>(
    PROJECT_DELIVERABLE_KINDS,
  );

const DESTINATION_ROLES =
  new Set<ProjectDriveDestinationRole>(
    PROJECT_DRIVE_DESTINATION_ROLES,
  );

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every(
    (key) => keys.has(key),
  );
}

function clean(value: string): string {
  return value.trim();
}

export function normalizeProjectDeliverable(
  input: ProjectDeliverableRef,
): ProjectDeliverableRef {
  if (
    input === null ||
    typeof input !== "object" ||
    !DELIVERABLE_KINDS.has(input.kind) ||
    !clean(input.path) ||
    !clean(input.fingerprint) ||
    !DESTINATION_ROLES.has(input.destinationRole)
  ) {
    throw new Error(
      "Project deliverable requires kind/path/fingerprint and a supported destinationRole.",
    );
  }
  return {
    kind: input.kind,
    path: clean(input.path),
    fingerprint: clean(input.fingerprint),
    destinationRole: input.destinationRole,
  };
}

export function normalizeProjectRecord(
  input: ProjectRecord,
): ProjectRecord {
  if (
    input === null ||
    typeof input !== "object"
  ) {
    throw new Error(
      "Project record must be an object.",
    );
  }
  const record =
    input as unknown as Record<string, unknown>;
  if (
    !hasOnlyKeys(
      record,
      [
        "schemaVersion",
        "projectId",
        "projectName",
        "taskClass",
        "revision",
        "artifact",
        "work",
        "knowledge",
        "publication",
      ],
    )
  ) {
    throw new Error(
      "Project record contains unsupported or legacy fields.",
    );
  }
  if (input.schemaVersion !== 1) {
    throw new Error(
      "Unsupported project record schemaVersion.",
    );
  }
  if (
    input.artifact === null ||
    typeof input.artifact !== "object" ||
    input.work === null ||
    typeof input.work !== "object" ||
    input.knowledge === null ||
    typeof input.knowledge !== "object" ||
    input.publication === null ||
    typeof input.publication !== "object"
  ) {
    throw new Error(
      "Project record artifact/work/knowledge/publication must be objects.",
    );
  }

  if (
    !hasOnlyKeys(
      input.artifact as unknown as Record<string, unknown>,
      [
        "artifactId",
        "artifactFingerprint",
        "version",
      ],
    ) ||
    !hasOnlyKeys(
      input.work as unknown as Record<string, unknown>,
      [
        "sessionId",
        "workSessionRevision",
      ],
    ) ||
    !hasOnlyKeys(
      input.knowledge as unknown as Record<string, unknown>,
      [
        "bugReportPath",
      ],
    ) ||
    !hasOnlyKeys(
      input.publication as unknown as Record<string, unknown>,
      [
        "drive",
        "approvalSnapshotFingerprint",
        "drivePublishReceiptFingerprint",
      ],
    )
  ) {
    throw new Error(
      "Project record contains duplicate/legacy nested state fields.",
    );
  }
  if (!PROJECT_TASK_CLASSES.has(input.taskClass)) {
    throw new Error(
      "Unsupported project task class.",
    );
  }
  if (
    !clean(input.projectId) ||
    !clean(input.projectName) ||
    !clean(input.artifact.artifactId) ||
    !clean(input.artifact.artifactFingerprint)
  ) {
    throw new Error(
      "Project record requires non-empty project/artifact identity.",
    );
  }
  if (
    !Number.isInteger(input.revision) ||
    input.revision < 1
  ) {
    throw new Error(
      "Project revision must be an integer >= 1.",
    );
  }
  if (
    input.work.workSessionRevision !== undefined &&
    (
      !Number.isInteger(
        input.work.workSessionRevision,
      ) ||
      input.work.workSessionRevision < 1
    )
  ) {
    throw new Error(
      "Work session revision must be an integer >= 1 when present.",
    );
  }
  if (
    input.publication
      .drivePublishReceiptFingerprint?.trim() &&
    !input.publication
      .approvalSnapshotFingerprint?.trim()
  ) {
    throw new Error(
      "Drive publication proof requires approvalSnapshotFingerprint.",
    );
  }

  if (
    input.publication.drive !== undefined &&
    normalizeDriveProjectBinding(
      input.publication.drive,
    ).projectId !== clean(input.projectId)
  ) {
    throw new Error(
      "Drive binding projectId mismatch.",
    );
  }

  return {
    schemaVersion: 1,
    projectId: clean(input.projectId),
    projectName: clean(input.projectName),
    taskClass: input.taskClass,
    revision: input.revision,
    artifact: {
      artifactId:
        clean(input.artifact.artifactId),
      artifactFingerprint:
        clean(
          input.artifact
            .artifactFingerprint,
        ),
      ...(input.artifact.version?.trim()
        ? {
            version:
              input.artifact.version.trim(),
          }
        : {}),
    },
    work: {
      ...(input.work.sessionId?.trim()
        ? {
            sessionId:
              input.work.sessionId.trim(),
          }
        : {}),
      ...(input.work.workSessionRevision ===
      undefined
        ? {}
        : {
            workSessionRevision:
              input.work
                .workSessionRevision,
          }),

    },
    knowledge: {
      ...(input.knowledge.bugReportPath?.trim()
        ? {
            bugReportPath:
              input.knowledge
                .bugReportPath.trim(),
          }
        : {}),
    },
    publication: {
      ...(input.publication.drive ===
      undefined
        ? {}
        : {
            drive:
              normalizeDriveProjectBinding(
                input.publication.drive,
              ),
          }),
      ...(input.publication
        .approvalSnapshotFingerprint
        ?.trim()
        ? {
            approvalSnapshotFingerprint:
              input.publication
                .approvalSnapshotFingerprint
                .trim(),
          }
        : {}),
      ...(input.publication
        .drivePublishReceiptFingerprint
        ?.trim()
        ? {
            drivePublishReceiptFingerprint:
              input.publication
                .drivePublishReceiptFingerprint
                .trim(),
          }
        : {}),
    },
  };
}

export function projectLifecycleStatus(
  project: ProjectRecord,
): ProjectLifecycleStatus {
  if (
    project.publication
      .drivePublishReceiptFingerprint
      ?.trim()
  ) {
    return "drive-published";
  }
  if (
    project.publication
      .approvalSnapshotFingerprint
      ?.trim()
  ) {
    return "approved";
  }
  return "working";
}

export function normalizeProjectRegistry(
  input: ProjectRegistry,
): ProjectRegistry {
  if (
    input === null ||
    typeof input !== "object"
  ) {
    throw new Error(
      "Project registry must be an object.",
    );
  }
  if (input.schemaVersion !== 1) {
    throw new Error(
      "Unsupported project registry schemaVersion.",
    );
  }
  if (!Array.isArray(input.projects)) {
    throw new Error(
      "Project registry projects must be an array.",
    );
  }

  const byId =
    new Map<string, ProjectRecord>();
  const artifactOwner =
    new Map<string, string>();
  const driveFileOwner =
    new Map<string, string>();
  const reportOwner =
    new Map<string, string>();

  for (const project of input.projects) {
    const normalized =
      normalizeProjectRecord(project);
    if (byId.has(normalized.projectId)) {
      throw new Error(
        "Project registry contains duplicate projectId: " +
          normalized.projectId,
      );
    }

    const previousArtifactOwner =
      artifactOwner.get(
        normalized.artifact.artifactId,
      );
    if (
      previousArtifactOwner !== undefined &&
      previousArtifactOwner !==
        normalized.projectId
    ) {
      throw new Error(
        "Project registry contains duplicate artifactId owned by multiple projects: " +
          normalized.artifact.artifactId +
          " (" +
          previousArtifactOwner +
          ", " +
          normalized.projectId +
          ").",
      );
    }
    artifactOwner.set(
      normalized.artifact.artifactId,
      normalized.projectId,
    );

    const driveFileId =
      normalized.publication.drive
        ?.currentWorld?.fileId;
    if (driveFileId) {
      const previousDriveOwner =
        driveFileOwner.get(driveFileId);
      if (
        previousDriveOwner !== undefined &&
        previousDriveOwner !==
          normalized.projectId
      ) {
        throw new Error(
          "Project registry contains duplicate current-world Drive file owned by multiple projects: " +
            driveFileId +
            " (" +
            previousDriveOwner +
            ", " +
            normalized.projectId +
            ").",
        );
      }
      driveFileOwner.set(
        driveFileId,
        normalized.projectId,
      );
    }

    const reportPath =
      normalized.knowledge.bugReportPath;
    if (reportPath) {
      const previousReportOwner =
        reportOwner.get(reportPath);
      if (
        previousReportOwner !== undefined &&
        previousReportOwner !==
          normalized.projectId
      ) {
        throw new Error(
          "Project registry contains duplicate canonical Bug Report path owned by multiple projects: " +
            reportPath +
            " (" +
            previousReportOwner +
            ", " +
            normalized.projectId +
            ").",
        );
      }
      reportOwner.set(
        reportPath,
        normalized.projectId,
      );
    }

    byId.set(
      normalized.projectId,
      normalized,
    );
  }

  return {
    schemaVersion: 1,
    projects: [...byId.values()].sort(
      (a, b) =>
        a.projectId.localeCompare(
          b.projectId,
        ),
    ),
  };
}
