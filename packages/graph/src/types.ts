import type { ComponentKind } from "../../project-model/src/component.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";

export type NodeId = string;

export interface SemanticNode {
  id: NodeId;
  kind: ComponentKind;
  identifier: string;
  source: SourceRef;
  metadata?: Readonly<Record<string, unknown>>;
}

export type EdgeType =
  | "CONTAINS"
  | "CALLS"
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
  | "REFERENCES";

export type ReferenceStatus = "resolved" | "unresolved" | "ambiguous";

export interface EdgeEvidence {
  source: SourceRef;
  excerpt?: string;
}

export interface SemanticEdge {
  id: string;
  from: NodeId;
  type: EdgeType;
  targetIdentifier: string;
  status: ReferenceStatus;
  to?: NodeId;
  candidates?: readonly NodeId[];
  evidence: EdgeEvidence;
}
