export interface DriveFolderRef {
  folderId: string;
  label?: string;
}

export interface DriveWorldRef {
  fileId: string;
  fileName: string;
  artifactFingerprint: string;
  version?: string;
}

export interface DriveProjectBinding {
  schemaVersion: 1;
  projectId: string;
  mapFolder: DriveFolderRef;
  currentWorld?: DriveWorldRef;
  rawDevFolder?: DriveFolderRef;
  oldVersionFolder?: DriveFolderRef;
}

export interface DriveRootBinding {
  schemaVersion: 1;
  provider: "google-drive";
  rootFolderId: string;
}

function nonEmpty(
  value: string,
  label: string,
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      label + " must be non-empty.",
    );
  }

  return normalized;
}

function normalizeFolder(
  value: DriveFolderRef | undefined,
  label: string,
): DriveFolderRef | undefined {
  if (value === undefined) {
    return undefined;
  }

  return {
    folderId: nonEmpty(
      value.folderId,
      label + " folder id",
    ),
    ...(value.label?.trim()
      ? { label: value.label.trim() }
      : {}),
  };
}

export function normalizeDriveRootBinding(
  binding: DriveRootBinding,
): DriveRootBinding {
  if (
    binding.schemaVersion !== 1 ||
    binding.provider !== "google-drive"
  ) {
    throw new Error(
      "Unsupported Drive root binding.",
    );
  }

  return {
    schemaVersion: 1,
    provider: "google-drive",
    rootFolderId: nonEmpty(
      binding.rootFolderId,
      "Drive root folder id",
    ),
  };
}

export function normalizeDriveProjectBinding(
  binding: DriveProjectBinding,
): DriveProjectBinding {
  if (binding.schemaVersion !== 1) {
    throw new Error(
      "Unsupported Drive project binding.",
    );
  }

  const rawDevFolder = normalizeFolder(
    binding.rawDevFolder,
    "Raw Dev",
  );
  const oldVersionFolder = normalizeFolder(
    binding.oldVersionFolder,
    "Old Version",
  );

  const currentWorld = binding.currentWorld === undefined
    ? undefined
    : {
        fileId: nonEmpty(
          binding.currentWorld.fileId,
          "Current world file id",
        ),
        fileName: nonEmpty(
          binding.currentWorld.fileName,
          "Current world file name",
        ),
        artifactFingerprint: nonEmpty(
          binding.currentWorld.artifactFingerprint,
          "Current world fingerprint",
        ),
        ...(binding.currentWorld.version?.trim()
          ? { version: binding.currentWorld.version.trim() }
          : {}),
      };

  return {
    schemaVersion: 1,
    projectId: nonEmpty(
      binding.projectId,
      "Project id",
    ),
    mapFolder: normalizeFolder(
      binding.mapFolder,
      "Map",
    )!,
    ...(currentWorld === undefined
      ? {}
      : { currentWorld }),
    ...(rawDevFolder === undefined
      ? {}
      : { rawDevFolder }),
    ...(oldVersionFolder === undefined
      ? {}
      : { oldVersionFolder }),
  };
}
