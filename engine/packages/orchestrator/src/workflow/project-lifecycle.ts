import { createHash } from "node:crypto";
import type {
  ProjectApprovalSnapshot,
  ProjectDeliverableRef,
  ProjectDrivePublishReceipt,
  ProjectLifecycleStatus,
  ProjectRecord,
} from "../../../project-model/src/index.js";

export interface ProjectApprovalReadiness {
  readonly ready: boolean;
  readonly missing: readonly string[];
}

function hash(value: unknown): string {
  return (
    "sha256:" +
    createHash("sha256")
      .update(JSON.stringify(value))
      .digest("hex")
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(
    values.map((value) => value.trim()).filter(Boolean),
  )].sort();
}

export function createProjectRecord(input: {
  readonly projectId: string;
  readonly projectName: string;
  readonly taskClass: ProjectRecord["taskClass"];
  readonly artifact: ProjectRecord["artifact"];
  readonly work?: ProjectRecord["work"];
  readonly driveFolderId?: string;
}): ProjectRecord {
  return {
    schemaVersion: 1,
    projectId: input.projectId.trim(),
    projectName: input.projectName.trim(),
    taskClass: input.taskClass,
    status: "working",
    revision: 1,
    artifact: {
      ...input.artifact,
    },
    work: {
      ...(input.work ?? {}),
    },
    knowledge: {
      historicalRegressionIds: [],
      failurePatternIds: [],
      mapKnowledgeIds: [],
    },
    publication: {
      ...(input.driveFolderId?.trim()
        ? { driveFolderId: input.driveFolderId.trim() }
        : {}),
    },
  };
}

export function updateProjectRecord(
  current: ProjectRecord,
  update: {
    readonly artifact?: ProjectRecord["artifact"];
    readonly work?: ProjectRecord["work"];
    readonly bugReportPath?: string;
    readonly historicalRegressionIds?: readonly string[];
    readonly failurePatternIds?: readonly string[];
    readonly mapKnowledgeIds?: readonly string[];
    readonly driveFolderId?: string;
  },
): ProjectRecord {
  const artifact =
    update.artifact ?? current.artifact;

  const materiallyChanged =
    artifact.artifactFingerprint !==
      current.artifact.artifactFingerprint ||
    JSON.stringify(update.work ?? current.work) !==
      JSON.stringify(current.work) ||
    (
      update.bugReportPath !== undefined &&
      update.bugReportPath !==
        current.knowledge.bugReportPath
    );

  return {
    ...current,
    status:
      materiallyChanged &&
      (
        current.status === "approved" ||
        current.status === "drive-published"
      )
        ? "working"
        : current.status,
    revision: current.revision + 1,
    artifact,
    work: {
      ...(update.work ?? current.work),
    },
    knowledge: {
      ...(update.bugReportPath?.trim()
        ? { bugReportPath: update.bugReportPath.trim() }
        : current.knowledge.bugReportPath === undefined
          ? {}
          : { bugReportPath: current.knowledge.bugReportPath }),
      historicalRegressionIds: unique(
        update.historicalRegressionIds ??
          current.knowledge.historicalRegressionIds,
      ),
      failurePatternIds: unique(
        update.failurePatternIds ??
          current.knowledge.failurePatternIds,
      ),
      mapKnowledgeIds: unique(
        update.mapKnowledgeIds ??
          current.knowledge.mapKnowledgeIds,
      ),
    },
    publication: {
      ...(update.driveFolderId?.trim()
        ? { driveFolderId: update.driveFolderId.trim() }
        : current.publication.driveFolderId === undefined
          ? {}
          : { driveFolderId: current.publication.driveFolderId }),
      ...(materiallyChanged
        ? {}
        : {
            ...(current.publication
              .approvalSnapshotFingerprint === undefined
              ? {}
              : {
                  approvalSnapshotFingerprint:
                    current.publication
                      .approvalSnapshotFingerprint,
                }),
            ...(current.publication
              .drivePublishReceiptFingerprint === undefined
              ? {}
              : {
                  drivePublishReceiptFingerprint:
                    current.publication
                      .drivePublishReceiptFingerprint,
                }),
          }),
    },
  };
}

export function assessProjectApprovalReadiness(input: {
  readonly project: ProjectRecord;
  readonly deliverables: readonly ProjectDeliverableRef[];
  readonly blockingReasons?: readonly string[];
  readonly requireBugReport?: boolean;
  readonly requireAuditComplete?: boolean;
}): ProjectApprovalReadiness {
  const missing: string[] = [];
  const project = input.project;

  if (!project.work.sessionId?.trim()) {
    missing.push("work session");
  }
  if (
    project.work.workSessionRevision === undefined ||
    project.work.workSessionRevision < 1
  ) {
    missing.push("work session revision");
  }
  if (
    input.requireAuditComplete &&
    project.work.currentStage !== "COMPLETE"
  ) {
    missing.push("completed selected-map audit");
  }
  if (
    input.requireBugReport &&
    !project.knowledge.bugReportPath?.trim()
  ) {
    missing.push("canonical Bug Report V2 reference");
  }
  if (!project.publication.driveFolderId?.trim()) {
    missing.push("Drive project folder binding");
  }
  if (input.deliverables.length === 0) {
    missing.push("approved deliverables");
  }
  for (const deliverable of input.deliverables) {
    if (
      !deliverable.path.trim() ||
      !deliverable.fingerprint.trim()
    ) {
      missing.push(
        "complete deliverable identity: " +
          deliverable.kind,
      );
    }
  }
  for (const reason of input.blockingReasons ?? []) {
    if (reason.trim()) {
      missing.push("blocker: " + reason.trim());
    }
  }

  return {
    ready: missing.length === 0,
    missing: unique(missing),
  };
}

export function prepareProjectForApproval(input: {
  readonly project: ProjectRecord;
  readonly deliverables: readonly ProjectDeliverableRef[];
  readonly blockingReasons?: readonly string[];
  readonly requireBugReport?: boolean;
  readonly requireAuditComplete?: boolean;
}): {
  readonly project: ProjectRecord;
  readonly readiness: ProjectApprovalReadiness;
} {
  const readiness =
    assessProjectApprovalReadiness(input);
  if (!readiness.ready) {
    throw new Error(
      "Project is not ready for approval: " +
        readiness.missing.join("; "),
    );
  }
  return {
    project: {
      ...input.project,
      status: "ready-for-approval",
      revision:
        input.project.revision + 1,
    },
    readiness,
  };
}

function approvalPayload(input: {
  readonly project: ProjectRecord;
  readonly deliverables: readonly ProjectDeliverableRef[];
}): Omit<ProjectApprovalSnapshot, "snapshotFingerprint"> {
  return {
    schemaVersion: 1,
    projectId: input.project.projectId,
    projectRevision: input.project.revision,
    artifactFingerprint:
      input.project.artifact.artifactFingerprint,
    ...(input.project.work.auditRevision?.trim()
      ? {
          auditRevision:
            input.project.work.auditRevision.trim(),
        }
      : {}),
    ...(input.project.knowledge.bugReportPath?.trim()
      ? {
          bugReportPath:
            input.project.knowledge.bugReportPath.trim(),
        }
      : {}),
    deliverables: [...input.deliverables]
      .map((item) => ({ ...item }))
      .sort((a, b) =>
        a.kind.localeCompare(b.kind) ||
        a.path.localeCompare(b.path)
      ),
    historicalRegressionIds: [
      ...input.project.knowledge.historicalRegressionIds,
    ].sort(),
  };
}

export function createProjectApprovalSnapshot(input: {
  readonly project: ProjectRecord;
  readonly deliverables: readonly ProjectDeliverableRef[];
}): ProjectApprovalSnapshot {
  if (input.project.status !== "ready-for-approval") {
    throw new Error(
      "Project must be ready-for-approval before snapshot approval.",
    );
  }
  const payload = approvalPayload(input);
  return {
    ...payload,
    snapshotFingerprint: hash(payload),
  };
}

export function validateProjectApprovalSnapshot(
  snapshot: ProjectApprovalSnapshot,
): readonly string[] {
  const issues: string[] = [];
  const payload: Omit<
    ProjectApprovalSnapshot,
    "snapshotFingerprint"
  > = {
    schemaVersion: snapshot.schemaVersion,
    projectId: snapshot.projectId,
    projectRevision: snapshot.projectRevision,
    artifactFingerprint:
      snapshot.artifactFingerprint,
    ...(snapshot.auditRevision === undefined
      ? {}
      : { auditRevision: snapshot.auditRevision }),
    ...(snapshot.bugReportPath === undefined
      ? {}
      : { bugReportPath: snapshot.bugReportPath }),
    deliverables: [...snapshot.deliverables],
    historicalRegressionIds: [
      ...snapshot.historicalRegressionIds,
    ],
  };
  if (
    snapshot.snapshotFingerprint !==
    hash(payload)
  ) {
    issues.push(
      "Project approval snapshot fingerprint is invalid.",
    );
  }
  return issues;
}

export function approveProject(
  current: ProjectRecord,
  snapshot: ProjectApprovalSnapshot,
): ProjectRecord {
  const snapshotIssues =
    validateProjectApprovalSnapshot(
      snapshot,
    );
  if (snapshotIssues.length > 0) {
    throw new Error(
      snapshotIssues.join("; "),
    );
  }
  if (
    snapshot.projectId !== current.projectId ||
    snapshot.projectRevision !== current.revision ||
    snapshot.artifactFingerprint !==
      current.artifact.artifactFingerprint
  ) {
    throw new Error(
      "Approval snapshot is stale or belongs to another project revision.",
    );
  }
  return {
    ...current,
    status: "approved",
    revision: current.revision + 1,
    publication: {
      ...current.publication,
      approvalSnapshotFingerprint:
        snapshot.snapshotFingerprint,
    },
  };
}

export function createDrivePublishReceipt(input: {
  readonly project: ProjectRecord;
  readonly snapshot: ProjectApprovalSnapshot;
  readonly files:
    readonly ProjectDrivePublishReceipt["files"][number][];
}): ProjectDrivePublishReceipt {
  if (input.project.status !== "approved") {
    throw new Error(
      "Drive publication requires an approved project.",
    );
  }
  if (
    input.project.publication
      .approvalSnapshotFingerprint !==
      input.snapshot.snapshotFingerprint
  ) {
    throw new Error(
      "Drive publication snapshot does not match the approved project snapshot.",
    );
  }

  const expected = new Map(
    input.snapshot.deliverables.map(
      (item) => [
        item.kind + "|" + item.fingerprint,
        item,
      ],
    ),
  );
  const publishedKeys = new Set(
    input.files.map(
      (item) =>
        item.kind + "|" + item.fingerprint,
    ),
  );
  const unexpected = [
    ...publishedKeys,
  ].filter((key) => !expected.has(key));
  if (unexpected.length > 0) {
    throw new Error(
      "Drive publication includes file(s) outside the approved snapshot: " +
        unexpected.sort().join(", "),
    );
  }
  const status =
    [...expected.keys()].every((key) =>
      publishedKeys.has(key)
    )
      ? "COMPLETE" as const
      : "PARTIAL" as const;

  const payload = {
    schemaVersion: 1 as const,
    projectId: input.project.projectId,
    snapshotFingerprint:
      input.snapshot.snapshotFingerprint,
    status,
    files: [...input.files]
      .map((item) => ({ ...item }))
      .sort((a, b) =>
        a.kind.localeCompare(b.kind) ||
        a.fileId.localeCompare(b.fileId)
      ),
  };

  return {
    ...payload,
    receiptFingerprint: hash(payload),
  };
}

export function validateDrivePublishReceipt(
  receipt: ProjectDrivePublishReceipt,
): readonly string[] {
  const payload = {
    schemaVersion: receipt.schemaVersion,
    projectId: receipt.projectId,
    snapshotFingerprint:
      receipt.snapshotFingerprint,
    status: receipt.status,
    files: [...receipt.files],
  };
  return receipt.receiptFingerprint ===
    hash(payload)
    ? []
    : [
        "Drive publish receipt fingerprint is invalid.",
      ];
}

export function applyDrivePublishReceipt(
  current: ProjectRecord,
  receipt: ProjectDrivePublishReceipt,
): ProjectRecord {
  const receiptIssues =
    validateDrivePublishReceipt(receipt);
  if (receiptIssues.length > 0) {
    throw new Error(
      receiptIssues.join("; "),
    );
  }
  if (
    current.status !== "approved" ||
    receipt.projectId !== current.projectId ||
    receipt.snapshotFingerprint !==
      current.publication.approvalSnapshotFingerprint
  ) {
    throw new Error(
      "Drive receipt does not match the current approved project snapshot.",
    );
  }
  if (receipt.status !== "COMPLETE") {
    throw new Error(
      "Partial Drive publication cannot mark project drive-published.",
    );
  }

  return {
    ...current,
    status: "drive-published",
    revision: current.revision + 1,
    publication: {
      ...current.publication,
      drivePublishReceiptFingerprint:
        receipt.receiptFingerprint,
    },
  };
}

export function projectLifecycleCanTransition(
  from: ProjectLifecycleStatus,
  to: ProjectLifecycleStatus,
): boolean {
  return (
    (from === "working" &&
      to === "ready-for-approval") ||
    (from === "ready-for-approval" &&
      to === "approved") ||
    (from === "approved" &&
      to === "drive-published") ||
    (
      (from === "approved" ||
        from === "drive-published") &&
      to === "working"
    )
  );
}
