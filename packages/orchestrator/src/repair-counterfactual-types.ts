import type { ComponentKind } from "../../project-model/src/component.js";
import type { PatchTransaction } from "../../repair/src/types.js";

export interface RepairImpactTrace {
  changedNodeId: string;
  affectedNodeId: string;
  nodePath: readonly string[];
  edgePath: readonly string[];
  depth: number;
}

export interface RepairCounterfactualImpact {
  transactionId: string;
  changedNodeIds: readonly string[];
  unknownChangedNodeIds: readonly string[];
  affectedNodeIds: readonly string[];
  affectedPaths: readonly string[];
  affectedKinds: readonly ComponentKind[];
  impactTraces: readonly RepairImpactTrace[];
  maxImpactDepth: number;
  unresolvedEdgeIds: readonly string[];
  ambiguousEdgeIds: readonly string[];
  graphCoverageComplete: boolean;
}

export type RepairBlastRadiusDisposition =
  | "minimal"
  | "bounded"
  | "review-required"
  | "blocked"
  | "indeterminate";

export interface RepairBlastRadiusPolicy {
  maxAffectedNodes: number;
  maxAffectedPaths: number;
  maxAffectedKinds: number;
  maxImpactDepth: number;
  sensitiveKinds: readonly ComponentKind[];
  blockOnUnresolvedTopology: boolean;
  blockOnAmbiguousTopology: boolean;
}

export interface RepairBlastRadiusDecision {
  transactionId: string;
  disposition: RepairBlastRadiusDisposition;
  affectedNodes: number;
  affectedPaths: number;
  affectedKinds: readonly ComponentKind[];
  sensitiveKinds: readonly ComponentKind[];
  reasons: readonly string[];
}

export interface RepairCounterfactualInput {
  transaction: PatchTransaction;
  changedNodeIds: readonly string[];
}
