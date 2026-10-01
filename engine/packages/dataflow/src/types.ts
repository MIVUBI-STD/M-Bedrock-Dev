import type { SourceRef } from "../../project-model/src/index.js";

export type DataFlowNodeKind =
  | "binding"
  | "parameter"
  | "return"
  | "call"
  | "call-result"
  | "property"
  | "literal"
  | "sink"
  | "unknown";

export interface DataFlowNode {
  id: string;
  kind: DataFlowNodeKind;
  modulePath: string;
  regionId?: string;
  symbol?: string;
  label?: string;
  source?: SourceRef;
}

export type DataFlowEdgeKind =
  | "assignment"
  | "argument"
  | "return"
  | "call-result"
  | "invocation-result"
  | "property-read"
  | "capture"
  | "unknown";

export interface DataFlowEdge {
  id: string;
  from: string;
  to: string;
  kind: DataFlowEdgeKind;
  source?: SourceRef;
  confidence: "exact" | "bounded";
}

export interface DataFlowGraph {
  schemaVersion: 1;
  nodes: readonly DataFlowNode[];
  edges: readonly DataFlowEdge[];
  unresolved: readonly {
    id: string;
    reason: string;
    source?: SourceRef;
  }[];
}
