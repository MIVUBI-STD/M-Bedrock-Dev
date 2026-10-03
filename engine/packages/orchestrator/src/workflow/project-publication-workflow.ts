import type {
  BugReportV2,
} from "../../../bug-report/src/index.js";
import type {
  ProjectDeliverableRef,
  ProjectDrivePublishReceipt,
  ProjectRecord,
  ProjectWorkspaceLayout,
} from "../../../project-model/src/index.js";
import {
  applyDrivePublishReceipt,
  approveProject,
  createDrivePublishReceipt,
  createProjectApprovalSnapshot,
  prepareProjectForApproval,
} from "./project-lifecycle.js";
import {
  syncApprovedProjectIssueHistory,
} from "./project-history-sync.js";
import {
  saveProjectApprovalSnapshot,
  saveProjectDrivePublishReceipt,
  upsertProjectRecord,
} from "./project-registry-store.js";

export async function prepareAndPersistProjectApproval(input: {
  readonly repositoryRoot: string;
  readonly project: ProjectRecord;
  readonly deliverables: readonly ProjectDeliverableRef[];
  readonly blockingReasons?: readonly string[];
  readonly requireBugReport?: boolean;
  readonly requireAuditComplete?: boolean;
}): Promise<ProjectRecord> {
  const prepared =
    prepareProjectForApproval({
      project: input.project,
      deliverables: input.deliverables,
      blockingReasons:
        input.blockingReasons,
      requireBugReport:
        input.requireBugReport,
      requireAuditComplete:
        input.requireAuditComplete,
    }).project;

  await upsertProjectRecord(
    input.repositoryRoot,
    prepared,
  );
  return prepared;
}

export async function approveAndPersistProject(input: {
  readonly repositoryRoot: string;
  readonly workspace: ProjectWorkspaceLayout;
  readonly project: ProjectRecord;
  readonly deliverables: readonly ProjectDeliverableRef[];
}): Promise<{
  readonly project: ProjectRecord;
  readonly snapshot:
    ReturnType<typeof createProjectApprovalSnapshot>;
}> {
  const snapshot =
    createProjectApprovalSnapshot({
      project: input.project,
      deliverables: input.deliverables,
    });
  const approved =
    approveProject(
      input.project,
      snapshot,
    );

  await saveProjectApprovalSnapshot(
    input.workspace,
    snapshot,
  );
  await upsertProjectRecord(
    input.repositoryRoot,
    approved,
  );

  return {
    project: approved,
    snapshot,
  };
}

export async function approveAuditProjectAndPersist(input: {
  readonly repositoryRoot: string;
  readonly workspace: ProjectWorkspaceLayout;
  readonly project: ProjectRecord;
  readonly deliverables: readonly ProjectDeliverableRef[];
  readonly report: BugReportV2;
  readonly reportPath: string;
}): Promise<{
  readonly project: ProjectRecord;
  readonly snapshot:
    ReturnType<typeof createProjectApprovalSnapshot>;
  readonly historicalRegressionIds:
    readonly string[];
}> {
  if (input.project.status !== "ready-for-approval") {
    throw new Error(
      "Audit project must be ready-for-approval before historical sync and approval.",
    );
  }

  const history =
    await syncApprovedProjectIssueHistory({
      repositoryRoot: input.repositoryRoot,
      project: input.project,
      report: input.report,
      reportPath: input.reportPath,
    });

  const snapshot =
    createProjectApprovalSnapshot({
      project: history.project,
      deliverables: input.deliverables,
    });
  const approved =
    approveProject(
      history.project,
      snapshot,
    );

  await saveProjectApprovalSnapshot(
    input.workspace,
    snapshot,
  );
  await upsertProjectRecord(
    input.repositoryRoot,
    approved,
  );

  return {
    project: approved,
    snapshot,
    historicalRegressionIds:
      history.historicalRegressionIds,
  };
}

export async function recordAndPersistDrivePublication(input: {
  readonly repositoryRoot: string;
  readonly workspace: ProjectWorkspaceLayout;
  readonly project: ProjectRecord;
  readonly snapshot:
    ReturnType<typeof createProjectApprovalSnapshot>;
  readonly files:
    readonly ProjectDrivePublishReceipt["files"][number][];
}): Promise<{
  readonly project: ProjectRecord;
  readonly receipt: ProjectDrivePublishReceipt;
}> {
  const receipt =
    createDrivePublishReceipt({
      project: input.project,
      snapshot: input.snapshot,
      files: input.files,
    });

  await saveProjectDrivePublishReceipt(
    input.workspace,
    receipt,
  );

  if (receipt.status !== "COMPLETE") {
    return {
      project: input.project,
      receipt,
    };
  }

  const published =
    applyDrivePublishReceipt(
      input.project,
      receipt,
    );
  await upsertProjectRecord(
    input.repositoryRoot,
    published,
  );

  return {
    project: published,
    receipt,
  };
}
