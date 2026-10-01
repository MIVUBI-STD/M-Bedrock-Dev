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

export interface DriveProjectBinding {
  schemaVersion: 1;
  projectId: string;
  mapFolder: DriveFolderRef;
  rawDevFolder?: DriveFolderRef;
  oldVersionFolder?: DriveFolderRef;
  currentArtifact?: DriveArtifactRef;
}

export interface DriveRootBinding {
  schemaVersion: 1;
  provider: "google-drive";
  rootFolderId: string;
}

function nonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(label + " must be non-empty.");
  return normalized;
}

function normalizeFolder(
  value: DriveFolderRef | undefined,
  label: string,
): DriveFolderRef | undefined {
  if (value === undefined) return undefined;
  return {
    folderId: nonEmpty(value.folderId, label + " folder id"),
    ...(value.label?.trim() ? { label: value.label.trim() } : {}),
  };
}

export function normalizeDriveRootBinding(
  binding: DriveRootBinding,
): DriveRootBinding {
  if (binding.schemaVersion !== 1 || binding.provider !== "google-drive") {
    throw new Error("Unsupported Drive root binding.");
  }
  return {
    schemaVersion: 1,
    provider: "google-drive",
    rootFolderId: nonEmpty(binding.rootFolderId, "Drive root folder id"),
  };
}

export function normalizeDriveProjectBinding(
  binding: DriveProjectBinding,
): DriveProjectBinding {
  if (binding.schemaVersion !== 1) {
    throw new Error("Unsupported Drive project binding.");
  }

  const currentArtifact =
    binding.currentArtifact === undefined
      ? undefined
      : {
          fileId: nonEmpty(binding.currentArtifact.fileId, "Drive artifact file id"),
          artifactId: nonEmpty(binding.currentArtifact.artifactId, "Artifact id"),
          artifactFingerprint: nonEmpty(
            binding.currentArtifact.artifactFingerprint,
            "Artifact fingerprint",
          ),
          fileName: nonEmpty(binding.currentArtifact.fileName, "Artifact file name"),
          ...(binding.currentArtifact.version?.trim()
            ? { version: binding.currentArtifact.version.trim() }
            : {}),
          ...(binding.currentArtifact.revisionId?.trim()
            ? { revisionId: binding.currentArtifact.revisionId.trim() }
            : {}),
          ...(binding.currentArtifact.modifiedTime?.trim()
            ? { modifiedTime: binding.currentArtifact.modifiedTime.trim() }
            : {}),
        };

  const rawDevFolder = normalizeFolder(binding.rawDevFolder, "Raw Dev");
  const oldVersionFolder = normalizeFolder(binding.oldVersionFolder, "Old Version");

  return {
    schemaVersion: 1,
    projectId: nonEmpty(binding.projectId, "Project id"),
    mapFolder: normalizeFolder(binding.mapFolder, "Map")!,
    ...(rawDevFolder ? { rawDevFolder } : {}),
    ...(oldVersionFolder ? { oldVersionFolder } : {}),
    ...(currentArtifact ? { currentArtifact } : {}),
  };
}
