import type { ArtifactChildRef, ArtifactIdentity } from "../../artifact/src/identity.js";
import type { ProjectComponent } from "./component.js";

export interface FileInventoryEntry {
  relativePath: string;
  size: number;
  kindHint?: string;
  contentHash?: string;
}

export interface ProjectModel {
  projectId: string;
  artifact: ArtifactIdentity;
  artifactChildren: ArtifactChildRef[];
  files: FileInventoryEntry[];
  components: ProjectComponent[];
  schemaVersion: number;
}
