import {
  mkdir,
  readFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  atomicWriteText,
} from "../../../repair/src/index.js";
import {
  projectLifecycleCanTransition,
  validateDrivePublishReceipt,
  validateProjectApprovalSnapshot,
} from "./project-lifecycle.js";
import {
  normalizeProjectRecord,
  normalizeProjectRegistry,
  projectLifecycleStatus,
  type ProjectApprovalSnapshot,
  type ProjectDrivePublishReceipt,
  type ProjectRecord,
  type ProjectRegistry,
  type ProjectWorkspaceLayout,
} from "../../../project-model/src/index.js";

export const PROJECT_REGISTRY_PATH =
  "workspace/project-registry.json" as const;

async function readJsonIfExists(
  path: string,
): Promise<unknown | undefined> {
  try {
    return JSON.parse(
      await readFile(path, "utf8"),
    );
  } catch (error) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String(
            (error as { code?: unknown }).code,
          )
        : undefined;
    if (code === "ENOENT") return undefined;
    throw error;
  }
}

export async function loadProjectRegistry(
  repositoryRoot: string,
): Promise<ProjectRegistry> {
  const path = join(
    repositoryRoot,
    PROJECT_REGISTRY_PATH,
  );
  const raw = await readJsonIfExists(path);
  return raw === undefined
    ? { schemaVersion: 1, projects: [] }
    : normalizeProjectRegistry(
        raw as ProjectRegistry,
      );
}

export async function saveProjectRegistry(
  repositoryRoot: string,
  registry: ProjectRegistry,
): Promise<ProjectRegistry> {
  const normalized =
    normalizeProjectRegistry(registry);
  const path = join(
    repositoryRoot,
    PROJECT_REGISTRY_PATH,
  );
  await mkdir(dirname(path), {
    recursive: true,
  });
  await atomicWriteText(
    path,
    JSON.stringify(normalized, null, 2) + "\n",
  );
  return normalized;
}

export async function upsertProjectRecord(
  repositoryRoot: string,
  project: ProjectRecord,
): Promise<ProjectRegistry> {
  const registry =
    await loadProjectRegistry(repositoryRoot);
  const normalized =
    normalizeProjectRecord(project);
  const previous = registry.projects.find(
    (item) =>
      item.projectId === normalized.projectId,
  );

  if (previous !== undefined) {
    if (
      normalized.revision < previous.revision
    ) {
      throw new Error(
        "Refusing stale project registry update for " +
          normalized.projectId +
          ".",
      );
    }
    if (
      normalized.revision === previous.revision
    ) {
      if (
        JSON.stringify(normalized) ===
        JSON.stringify(previous)
      ) {
        return registry;
      }
      throw new Error(
        "Refusing conflicting project registry content at the same revision for " +
          normalized.projectId +
          ".",
      );
    }
    if (
      normalized.revision !==
        previous.revision + 1
    ) {
      throw new Error(
        "Project registry revision must advance exactly one step for " +
          normalized.projectId +
          ".",
      );
    }
    const previousStatus =
      projectLifecycleStatus(previous);
    const nextStatus =
      projectLifecycleStatus(normalized);
    if (
      nextStatus !== previousStatus &&
      !projectLifecycleCanTransition(
        previousStatus,
        nextStatus,
      )
    ) {
      throw new Error(
        "Invalid project lifecycle transition: " +
          previousStatus +
          " -> " +
          nextStatus +
          ".",
      );
    }
  }

  return saveProjectRegistry(
    repositoryRoot,
    {
      schemaVersion: 1,
      projects: [
        ...registry.projects.filter(
          (item) =>
            item.projectId !==
            normalized.projectId,
        ),
        normalized,
      ],
    },
  );
}

function safeFingerprint(
  value: string,
): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function approvalPath(
  workspace: ProjectWorkspaceLayout,
  snapshotFingerprint: string,
): string {
  return join(
    workspace.state,
    "approvals",
    safeFingerprint(snapshotFingerprint) +
      ".json",
  );
}

function driveReceiptPath(
  workspace: ProjectWorkspaceLayout,
  snapshotFingerprint: string,
): string {
  return join(
    workspace.state,
    "publications",
    safeFingerprint(snapshotFingerprint) +
      ".json",
  );
}

export async function saveProjectApprovalSnapshot(
  workspace: ProjectWorkspaceLayout,
  snapshot: ProjectApprovalSnapshot,
): Promise<void> {
  const issues =
    validateProjectApprovalSnapshot(
      snapshot,
    );
  if (issues.length > 0) {
    throw new Error(
      issues.join("; "),
    );
  }

  const path = approvalPath(
    workspace,
    snapshot.snapshotFingerprint,
  );
  await mkdir(dirname(path), {
    recursive: true,
  });
  const existing =
    await readJsonIfExists(
      path,
    ) as ProjectApprovalSnapshot | undefined;

  if (
    existing !== undefined &&
    JSON.stringify(existing) !==
      JSON.stringify(snapshot)
  ) {
    throw new Error(
      "Conflicting project approval snapshot for the same fingerprint.",
    );
  }
  if (existing !== undefined) {
    return;
  }

  await atomicWriteText(
    path,
    JSON.stringify(snapshot, null, 2) + "\n",
  );
}

export async function loadProjectApprovalSnapshot(
  workspace: ProjectWorkspaceLayout,
  snapshotFingerprint: string,
): Promise<ProjectApprovalSnapshot | undefined> {
  const snapshot =
    await readJsonIfExists(
      approvalPath(
        workspace,
        snapshotFingerprint,
      ),
    ) as ProjectApprovalSnapshot | undefined;
  if (snapshot === undefined) {
    return undefined;
  }
  const issues =
    validateProjectApprovalSnapshot(
      snapshot,
    );
  if (issues.length > 0) {
    throw new Error(
      issues.join("; "),
    );
  }
  return snapshot;
}

export async function saveProjectDrivePublishReceipt(
  workspace: ProjectWorkspaceLayout,
  receipt: ProjectDrivePublishReceipt,
): Promise<void> {
  const issues =
    validateDrivePublishReceipt(
      receipt,
    );
  if (issues.length > 0) {
    throw new Error(
      issues.join("; "),
    );
  }

  const path = driveReceiptPath(
    workspace,
    receipt.snapshotFingerprint,
  );
  await mkdir(dirname(path), {
    recursive: true,
  });

  const existing =
    await readJsonIfExists(
      path,
    ) as ProjectDrivePublishReceipt | undefined;

  if (existing !== undefined) {
    if (
      existing.receiptFingerprint ===
        receipt.receiptFingerprint
    ) {
      return;
    }

    const existingKeys = new Set(
      existing.files.map(
        (item) =>
          item.kind + "|" +
          item.fingerprint + "|" +
          item.fileId,
      ),
    );
    const incomingKeys = new Set(
      receipt.files.map(
        (item) =>
          item.kind + "|" +
          item.fingerprint + "|" +
          item.fileId,
      ),
    );
    const monotonic =
      [...existingKeys].every((key) =>
        incomingKeys.has(key)
      );

    if (
      !monotonic ||
      existing.status === "COMPLETE"
    ) {
      throw new Error(
        "Conflicting Drive publish receipt for the same approved snapshot.",
      );
    }
  }

  await atomicWriteText(
    path,
    JSON.stringify(receipt, null, 2) + "\n",
  );
}

export async function loadProjectDrivePublishReceipt(
  workspace: ProjectWorkspaceLayout,
  snapshotFingerprint: string,
): Promise<ProjectDrivePublishReceipt | undefined> {
  const receipt =
    await readJsonIfExists(
      driveReceiptPath(
        workspace,
        snapshotFingerprint,
      ),
    ) as ProjectDrivePublishReceipt | undefined;
  if (receipt === undefined) {
    return undefined;
  }
  const issues =
    validateDrivePublishReceipt(
      receipt,
    );
  if (issues.length > 0) {
    throw new Error(
      issues.join("; "),
    );
  }
  return receipt;
}
