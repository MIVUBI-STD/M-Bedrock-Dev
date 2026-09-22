import type {
  ArtifactConfidence,
  ArtifactContainer,
  ArtifactEdition,
  ArtifactKind,
} from "./kinds.js";

export interface ArtifactIdentity {
  artifactId: string;
  fingerprint: string;
  sourceName: string;
  sourceSize: number;
  declaredType?: ArtifactKind;
  detectedType: ArtifactKind;
  edition: ArtifactEdition;
  container: ArtifactContainer;
  confidence: ArtifactConfidence;
  sourceState: "immutable";
}

export interface ArtifactChildRef {
  artifactId: string;
  relationship: "contains";
  relativePath: string;
}
