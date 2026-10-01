import {
  mkdir,
  readFile,
} from "node:fs/promises";
import {
  join,
} from "node:path";
import {
  atomicWriteText,
} from "../../../repair/src/index.js";
import {
  normalizeDriveProjectBinding,
  type DriveProjectBinding,
  type ProjectWorkspaceLayout,
} from "../../../project-model/src/index.js";

function pathFor(
  workspace: ProjectWorkspaceLayout,
): string {
  return join(
    workspace.state,
    "drive-binding.json",
  );
}

export async function loadDriveProjectBinding(
  workspace: ProjectWorkspaceLayout,
): Promise<DriveProjectBinding | undefined> {
  try {
    const text = await readFile(
      pathFor(workspace),
      "utf8",
    );

    return normalizeDriveProjectBinding(
      JSON.parse(text) as DriveProjectBinding,
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

    if (code === "ENOENT") {
      return undefined;
    }

    throw error;
  }
}

export async function saveDriveProjectBinding(
  workspace: ProjectWorkspaceLayout,
  binding: DriveProjectBinding,
): Promise<void> {
  const normalized =
    normalizeDriveProjectBinding(binding);
  const existing =
    await loadDriveProjectBinding(workspace);

  if (
    existing !== undefined &&
    existing.projectId !== normalized.projectId
  ) {
    throw new Error(
      "Refusing to rebind a project workspace to a different Drive project id.",
    );
  }

  await mkdir(
    workspace.state,
    { recursive: true },
  );

  await atomicWriteText(
    pathFor(workspace),
    JSON.stringify(
      normalized,
      null,
      2,
    ) + "\n",
  );
}
