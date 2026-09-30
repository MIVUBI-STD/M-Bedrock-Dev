export type ArtifactKind =
  | "world"
  | "behavior_pack"
  | "resource_pack"
  | "addon"
  | "structure"
  | "directory"
  | "unknown_archive"
  | "unknown_binary";

export type ArtifactContainer = "zip" | "directory" | "binary" | "unknown";
export type ArtifactEdition = "bedrock" | "education" | "unknown";
export type ArtifactConfidence = "high" | "medium" | "low";
