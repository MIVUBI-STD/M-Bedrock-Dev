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
} from "./project-lifecycle.js";
import {
  normalizeProjectRecord,
  normalizeProjectRegistry,
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
    if (
      normalized.status !== previous.status &&
      !projectLifecycleCanTransition(
        previous.status,
        normalized.status,
      )
    ) {
      throw new Error(
        "Invalid project lifecycle transition: " +
          previous.status +
          " -> " +
          normalized.status +
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

function approvalPath(
  workspace: ProjectWorkspaceLayout,
): string {
  return join(
    workspace.state,
    "approval-snapshot.json",
  );
}

function driveReceiptPath(
  workspace: ProjectWorkspaceLayout,
): string {
  return join(
    workspace.state,
    "drive-publish-receipt.json",
  );
}

export async function saveProjectApprovalSnapshot(
  workspace: ProjectWorkspaceLayout,
  snapshot: ProjectApprovalSnapshot,
): Promise<void> {
  await mkdir(workspace.state, {
    recursive: true,
  });
  const existing =
    await readJsonIfExists(
      approvalPath(workspace),
    ) as ProjectApprovalSnapshot | undefined;
  if (
    existing !== undefined &&
    existing.snapshotFingerprint !==
      snapshot.snapshotFingerprint
  ) {
    throw new Error(
      "Refusing to overwrite a different approved project snapshot. Create a new project revision first.",
    );
  }
  await atomicWriteText(
    approvalPath(workspace),
    JSON.stringify(snapshot, null, 2) + "\n",
  );
}

export async function loadProjectApprovalSnapshot(
  workspace: ProjectWorkspaceLayout,
): Promise<ProjectApprovalSnapshot | undefined> {
  return await readJsonIfExists(
    approvalPath(workspace),
  ) as ProjectApprovalSnapshot | undefined;
}

export async function saveProjectDrivePublishReceipt(
  workspace: ProjectWorkspaceLayout,
  receipt: ProjectDrivePublishReceipt,
): Promise<void> {
  await mkdir(workspace.state, {
    recursive: true,
  });
  const existing =
    await readJsonIfExists(
      driveReceiptPath(workspace),
    ) as ProjectDrivePublishReceipt | undefined;
  if (
    existing !== undefined &&
    existing.snapshotFingerprint ===
      receipt.snapshotFingerprint &&
    existing.receiptFingerprint !==
      receipt.receiptFingerprint
  ) {
    throw new Error(
      "Conflicting Drive publish receipt for the same approved snapshot.",
    );
  }
  await atomicWriteText(
    driveReceiptPath(workspace),
    JSON.stringify(receipt, null, 2) + "\n",
  );
}

export async function loadProjectDrivePublishReceipt(
  workspace: ProjectWorkspaceLayout,
): Promise<ProjectDrivePublishReceipt | undefined> {
  return await readJsonIfExists(
    driveReceiptPath(workspace),
  ) as ProjectDrivePublishReceipt | undefined;
}
