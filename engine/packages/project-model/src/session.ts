export interface ProjectSession {
  projectId: string;
  sourceArtifactId: string;
  sourceFingerprint: string;
  targetEdition: "bedrock" | "education" | "unknown";
  targetVersion?: string;
  workingRevision: number;
  patchHead?: string;
  indexRevision: number;
}
