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

export interface DriveProjectFolders {
  developmentSource?: DriveFolderRef;
  developmentVersions?: DriveFolderRef;
  technicalDocs?: DriveFolderRef;
}

export interface DriveProjectBinding {
  schemaVersion: 1;
  projectId: string;
  mapFolder: DriveFolderRef;
  folders?: DriveProjectFolders;
  currentWorld?: DriveWorldRef;
}

export interface DriveRootBinding {
  schemaVersion: 1;
  provider: "google-drive";
  rootFolderId: string;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const keys = new Set(allowed);
  return Object.keys(value).every(
    (key) => keys.has(key),
  );
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
  value: DriveFolderRef,
  label: string,
): DriveFolderRef {
  return {
    folderId:
      nonEmpty(
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
    rootFolderId:
      nonEmpty(
        binding.rootFolderId,
        "Drive root folder id",
      ),
  };
}

export function normalizeDriveProjectBinding(
  binding: DriveProjectBinding,
): DriveProjectBinding {
  if (
    binding === null ||
    typeof binding !== "object" ||
    binding.schemaVersion !== 1 ||
    !hasOnlyKeys(
      binding as unknown as Record<string, unknown>,
      [
        "schemaVersion",
        "projectId",
        "mapFolder",
        "folders",
        "currentWorld",
      ],
    )
  ) {
    throw new Error(
      "Unsupported Drive project binding.",
    );
  }

  const currentWorld =
    binding.currentWorld === undefined
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
          artifactFingerprint:
            nonEmpty(
              binding.currentWorld
                .artifactFingerprint,
              "Current world fingerprint",
            ),
          ...(binding.currentWorld.version
            ?.trim()
            ? {
                version:
                  binding.currentWorld
                    .version.trim(),
              }
            : {}),
        };

  if (
    binding.folders !== undefined &&
    !hasOnlyKeys(
      binding.folders as unknown as Record<string, unknown>,
      [
        "developmentSource",
        "developmentVersions",
        "technicalDocs",
      ],
    )
  ) {
    throw new Error(
      "Drive project folders contain unsupported fields.",
    );
  }

  const folders =
    binding.folders === undefined
      ? undefined
      : {
          ...(binding.folders
            .developmentSource ===
          undefined
            ? {}
            : {
                developmentSource:
                  normalizeFolder(
                    binding.folders
                      .developmentSource,
                    "Development Source",
                  ),
              }),
          ...(binding.folders
            .developmentVersions ===
          undefined
            ? {}
            : {
                developmentVersions:
                  normalizeFolder(
                    binding.folders
                      .developmentVersions,
                    "Development Versions",
                  ),
              }),
          ...(binding.folders
            .technicalDocs === undefined
            ? {}
            : {
                technicalDocs:
                  normalizeFolder(
                    binding.folders
                      .technicalDocs,
                    "Technical Docs",
                  ),
              }),
        };

  return {
    schemaVersion: 1,
    projectId:
      nonEmpty(
        binding.projectId,
        "Project id",
      ),
    mapFolder:
      normalizeFolder(
        binding.mapFolder,
        "Map",
      ),
    ...(folders === undefined
      ? {}
      : { folders }),
    ...(currentWorld === undefined
      ? {}
      : { currentWorld }),
  };
}
