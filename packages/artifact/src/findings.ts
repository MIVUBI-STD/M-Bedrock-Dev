export type ArtifactFindingSeverity = "info" | "warning" | "error" | "fatal";

export type ArtifactFindingCode =
  | "ARTIFACT_UNSUPPORTED"
  | "ARCHIVE_INVALID"
  | "ARCHIVE_PATH_TRAVERSAL"
  | "ARCHIVE_ABSOLUTE_PATH"
  | "ARCHIVE_LIMIT_EXCEEDED"
  | "ARCHIVE_DUPLICATE_PATH"
  | "ARCHIVE_CASE_COLLISION"
  | "ARCHIVE_RESERVED_PATH"
  | "CONTENT_AMBIGUOUS"
  | "UNKNOWN_CONTENT_PRESERVED";

export interface ArtifactFinding {
  code: ArtifactFindingCode;
  severity: ArtifactFindingSeverity;
  message: string;
  path?: string;
}
