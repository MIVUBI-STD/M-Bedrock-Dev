export type ProjectLifecycleStatus =
  | "working"
  | "ready-for-approval"
  | "approved"
  | "drive-published";

export type ProjectTaskClass =
  | "AUDIT"
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
  readonly auditRevision?: string;
  readonly currentStage?: string;
  readonly nextAction?: string;
}

export interface ProjectKnowledgeReferences {
  readonly bugReportPath?: string;
  readonly historicalRegressionIds: readonly string[];
  readonly failurePatternIds: readonly string[];
  readonly mapKnowledgeIds: readonly string[];
}

export interface ProjectPublicationState {
  readonly driveFolderId?: string;
  readonly approvalSnapshotFingerprint?: string;
  readonly drivePublishReceiptFingerprint?: string;
}

export interface ProjectRecord {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly projectName: string;
  readonly taskClass: ProjectTaskClass;
  readonly status: ProjectLifecycleStatus;
  readonly revision: number;
  readonly artifact: ProjectArtifactBinding;
  readonly work: ProjectWorkReference;
  readonly knowledge: ProjectKnowledgeReferences;
  readonly publication: ProjectPublicationState;
}

export interface ProjectDeliverableRef {
  readonly kind:
    | "map"
    | "bug-report"
    | "map-audit-report"
    | "guide"
    | "changelog"
    | "other";
  readonly path: string;
  readonly fingerprint: string;
}

export interface ProjectApprovalSnapshot {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly projectRevision: number;
  readonly artifactFingerprint: string;
  readonly auditRevision?: string;
  readonly bugReportPath?: string;
  readonly deliverables: readonly ProjectDeliverableRef[];
  readonly historicalRegressionIds: readonly string[];
  readonly snapshotFingerprint: string;
}

export interface DrivePublishedFile {
  readonly kind: ProjectDeliverableRef["kind"];
  readonly fileId: string;
  readonly fileName: string;
  readonly fingerprint: string;
}

export interface ProjectDrivePublishReceipt {
  readonly schemaVersion: 1;
  readonly projectId: string;
  readonly snapshotFingerprint: string;
  readonly status: "PARTIAL" | "COMPLETE";
  readonly files: readonly DrivePublishedFile[];
  readonly receiptFingerprint: string;
}

export interface ProjectRegistry {
  readonly schemaVersion: 1;
  readonly projects: readonly ProjectRecord[];
}

const PROJECT_STATUSES =
  new Set<ProjectLifecycleStatus>([
    "working",
    "ready-for-approval",
    "approved",
    "drive-published",
  ]);

const PROJECT_TASK_CLASSES =
  new Set<ProjectTaskClass>([
    "AUDIT",
    "REPAIR",
    "MODIFY",
    "DEVELOP",
    "VALIDATE",
    "RESEARCH",
  ]);

function clean(value: string): string {
  return value.trim();
}

function unique(values: readonly string[]): string[] {
  return [...new Set(
    values.map(clean).filter(Boolean),
  )].sort();
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
  if (input.schemaVersion !== 1) {
    throw new Error("Unsupported project record schemaVersion.");
  }
  if (!PROJECT_STATUSES.has(input.status)) {
    throw new Error(
      "Unsupported project lifecycle status.",
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
  if (!Number.isInteger(input.revision) || input.revision < 1) {
    throw new Error("Project revision must be an integer >= 1.");
  }
  if (
    input.work.workSessionRevision !== undefined &&
    (
      !Number.isInteger(input.work.workSessionRevision) ||
      input.work.workSessionRevision < 1
    )
  ) {
    throw new Error(
      "Work session revision must be an integer >= 1 when present.",
    );
  }
  if (
    (
      input.status === "approved" ||
      input.status === "drive-published"
    ) &&
    !input.publication
      .approvalSnapshotFingerprint?.trim()
  ) {
    throw new Error(
      "Approved project state requires approvalSnapshotFingerprint.",
    );
  }
  if (
    input.status === "drive-published" &&
    !input.publication
      .drivePublishReceiptFingerprint?.trim()
  ) {
    throw new Error(
      "drive-published project state requires drivePublishReceiptFingerprint.",
    );
  }

  return {
    ...input,
    projectId: clean(input.projectId),
    projectName: clean(input.projectName),
    artifact: {
      artifactId: clean(input.artifact.artifactId),
      artifactFingerprint:
        clean(input.artifact.artifactFingerprint),
      ...(input.artifact.version?.trim()
        ? { version: input.artifact.version.trim() }
        : {}),
    },
    work: {
      ...(input.work.sessionId?.trim()
        ? { sessionId: input.work.sessionId.trim() }
        : {}),
      ...(input.work.workSessionRevision === undefined
        ? {}
        : { workSessionRevision: input.work.workSessionRevision }),
      ...(input.work.auditRevision?.trim()
        ? { auditRevision: input.work.auditRevision.trim() }
        : {}),
      ...(input.work.currentStage?.trim()
        ? { currentStage: input.work.currentStage.trim() }
        : {}),
      ...(input.work.nextAction?.trim()
        ? { nextAction: input.work.nextAction.trim() }
        : {}),
    },
    knowledge: {
      ...(input.knowledge.bugReportPath?.trim()
        ? { bugReportPath: input.knowledge.bugReportPath.trim() }
        : {}),
      historicalRegressionIds:
        unique(input.knowledge.historicalRegressionIds),
      failurePatternIds:
        unique(input.knowledge.failurePatternIds),
      mapKnowledgeIds:
        unique(input.knowledge.mapKnowledgeIds),
    },
    publication: {
      ...(input.publication.driveFolderId?.trim()
        ? { driveFolderId: input.publication.driveFolderId.trim() }
        : {}),
      ...(input.publication.approvalSnapshotFingerprint?.trim()
        ? {
            approvalSnapshotFingerprint:
              input.publication.approvalSnapshotFingerprint.trim(),
          }
        : {}),
      ...(input.publication.drivePublishReceiptFingerprint?.trim()
        ? {
            drivePublishReceiptFingerprint:
              input.publication.drivePublishReceiptFingerprint.trim(),
          }
        : {}),
    },
  };
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
    throw new Error("Unsupported project registry schemaVersion.");
  }
  if (!Array.isArray(input.projects)) {
    throw new Error(
      "Project registry projects must be an array.",
    );
  }
  const byId = new Map<string, ProjectRecord>();
  for (const project of input.projects) {
    const normalized = normalizeProjectRecord(project);
    if (byId.has(normalized.projectId)) {
      throw new Error(
        "Project registry contains duplicate projectId: " +
          normalized.projectId,
      );
    }
    byId.set(normalized.projectId, normalized);
  }
  return {
    schemaVersion: 1,
    projects: [...byId.values()].sort((a, b) =>
      a.projectId.localeCompare(b.projectId)
    ),
  };
}
