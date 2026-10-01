export interface DriveFolderRef {
  folderId: string;
  label?: string;
}

export interface DriveArtifactRef {
  fileId: string;
  artifactId: string;
  artifactFingerprint: string;
  fileName: string;
  version?: string;
  revisionId?: string;
  modifiedTime?: string;
}

export interface DriveProjectFolders {
  map: DriveFolderRef;
  rawDev?: DriveFolderRef;
  oldVersion?: DriveFolderRef;
  docs?: DriveFolderRef;
  qa?: DriveFolderRef;
  release?: DriveFolderRef;
}

export interface DriveProjectBinding {
  schemaVersion: 1;
  projectId: string;
  folders: DriveProjectFolders;
  currentArtifact?: DriveArtifactRef;
}

export interface DriveRootBinding {
  schemaVersion: 1;
  provider: "google-drive";
  rootFolderId: string;
  systemFolderId: string;
  registryFolderId: string;
  portfolioQaFolderId: string;
  syncFolderId: string;
  provisioning: "lazy";
}

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(label + " must be non-empty.");
  }
  return normalized;
}

function normalizeFolder(
  value: DriveFolderRef | undefined,
  label: string,
): DriveFolderRef | undefined {
  if (value === undefined) return undefined;

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
    binding.provider !== "google-drive" ||
    binding.provisioning !== "lazy"
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
    systemFolderId: nonEmpty(
      binding.systemFolderId,
      "Drive system folder id",
    ),
    registryFolderId: nonEmpty(
      binding.registryFolderId,
      "Drive registry folder id",
    ),
    portfolioQaFolderId: nonEmpty(
      binding.portfolioQaFolderId,
      "Drive portfolio QA folder id",
    ),
    syncFolderId: nonEmpty(
      binding.syncFolderId,
      "Drive sync folder id",
    ),
    provisioning: "lazy",
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

  const rawDev =
    normalizeFolder(
      binding.folders.rawDev,
      "Raw Dev",
    );
  const oldVersion =
    normalizeFolder(
      binding.folders.oldVersion,
      "Old Version",
    );
  const docs =
    normalizeFolder(
      binding.folders.docs,
      "Docs",
    );
  const qa =
    normalizeFolder(
      binding.folders.qa,
      "QA",
    );
  const release =
    normalizeFolder(
      binding.folders.release,
      "Release",
    );

  const currentArtifact =
    binding.currentArtifact === undefined
      ? undefined
      : {
          fileId: nonEmpty(
            binding.currentArtifact.fileId,
            "Drive artifact file id",
          ),
          artifactId: nonEmpty(
            binding.currentArtifact.artifactId,
            "Artifact id",
          ),
          artifactFingerprint: nonEmpty(
            binding.currentArtifact
              .artifactFingerprint,
            "Artifact fingerprint",
          ),
          fileName: nonEmpty(
            binding.currentArtifact.fileName,
            "Artifact file name",
          ),
          ...(binding.currentArtifact
            .version?.trim()
            ? {
                version:
                  binding.currentArtifact
                    .version.trim(),
              }
            : {}),
          ...(binding.currentArtifact
            .revisionId?.trim()
            ? {
                revisionId:
                  binding.currentArtifact
                    .revisionId.trim(),
              }
            : {}),
          ...(binding.currentArtifact
            .modifiedTime?.trim()
            ? {
                modifiedTime:
                  binding.currentArtifact
                    .modifiedTime.trim(),
              }
            : {}),
        };

  return {
    schemaVersion: 1,
    projectId: nonEmpty(
      binding.projectId,
      "Project id",
    ),
    folders: {
      map: normalizeFolder(
        binding.folders.map,
        "Map",
      )!,
      ...(rawDev === undefined
        ? {}
        : { rawDev }),
      ...(oldVersion === undefined
        ? {}
        : { oldVersion }),
      ...(docs === undefined
        ? {}
        : { docs }),
      ...(qa === undefined
        ? {}
        : { qa }),
      ...(release === undefined
        ? {}
        : { release }),
    },
    ...(currentArtifact === undefined
      ? {}
      : { currentArtifact }),
  };
}
