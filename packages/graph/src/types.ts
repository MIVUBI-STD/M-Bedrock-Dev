import type { SourceRef } from "../../project-model/src/source-ref.js";
import type { ProjectComponent } from "../../project-model/src/component.js";

export type EdgeType =
  | "CALLS"
  | "IMPORTS_SCRIPT"
  | "IMPORTS_MINECRAFT_MODULE"
  | "LOADS_STRUCTURE"
  | "REFERENCES_ENTITY"
  | "USES_ANIMATION"
  | "USES_CONTROLLER"
  | "DEPENDS_ON_PACK"
  | "EXECUTES_EVENT"
  | "READS_SCOREBOARD"
  | "WRITES_SCOREBOARD"
  | "ADDS_TAG"
  | "REMOVES_TAG"
  | "TELEPORTS_TO"
  | "MODIFIES_REGION"
  | "REFERENCES"
  | "CONTAINS";

export type ReferenceStatus = "resolved" | "unresolved" | "ambiguous";

export interface SemanticNode extends ProjectComponent {
  kind: ProjectComponent["identity"]["kind"];
  identifier: string;
}

export interface SemanticEdge {
  id: string;
  from: string;
  type: EdgeType;
  targetIdentifier: string;
  status: ReferenceStatus;
  to?: string;
  candidates?: readonly string[];
  evidence: {
    source: SourceRef;
  };
}
