import type {
  SourceRef,
  StateAuthorityContract,
  StateSurfaceRef,
} from "../../project-model/src/index.js";

export type ExecutionRegionKind =
  | "event-source"
  | "script-module"
  | "script-function"
  | "script-callback"
  | "mcfunction";

export interface ExecutionRegion {
  id: string;
  kind: ExecutionRegionKind;
  ownerId: string;
  label: string;
  source?: SourceRef;
}

export type ExecutionEdgeKind =
  | "synchronous-call"
  | "event-dispatch"
  | "deferred"
  | "periodic";

export type IrResolution = "resolved" | "unresolved";

export interface ExecutionEdge {
  id: string;
  from: string;
  kind: ExecutionEdgeKind;
  targetLabel: string;
  resolution: IrResolution;
  to?: string;
  source: SourceRef;
  scheduler?: "run" | "runTimeout" | "runInterval" | "runJob";
  guardEvidence?: "explicit-generation-check" | "unresolved";
  guardIdentifiers?: readonly string[];
}

export interface StateSurface {
  id: string;
  ref: StateSurfaceRef;
}

export type StateOperationKind =
  | "read"
  | "write"
  | "delete"
  | "clear"
  | "enumerate"
  | "size";

export interface StateOperation {
  id: string;
  executionRegionId: string;
  surfaceId: string;
  operation: StateOperationKind;
  source: SourceRef;
  targetHint?: string;
}

export interface StateAuthorityBinding {
  contract: StateAuthorityContract;
  authoritySurfaceId: string;
  mirrorSurfaceIds: readonly string[];
}

export type TemporalRelationKind =
  | "same-turn"
  | "event-dispatch"
  | "deferred"
  | "periodic";

export interface TemporalRelation {
  id: string;
  from: string;
  targetLabel: string;
  resolution: IrResolution;
  to?: string;
  kind: TemporalRelationKind;
  source: SourceRef;
  guardEvidence?: "explicit-generation-check" | "unresolved";
  guardIdentifiers?: readonly string[];
}

export interface SemanticIr {
  schemaVersion: 1;
  execution: {
    regions: readonly ExecutionRegion[];
    edges: readonly ExecutionEdge[];
  };
  state: {
    surfaces: readonly StateSurface[];
    operations: readonly StateOperation[];
    authorityBindings: readonly StateAuthorityBinding[];
  };
  temporal: {
    relations: readonly TemporalRelation[];
  };
}
