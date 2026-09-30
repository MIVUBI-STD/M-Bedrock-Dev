export type TaskCostClass =
  | "cheap"
  | "moderate"
  | "expensive"
  | "very-expensive";

export interface TaskCapability {
  id: string;
  owner: string;
  pathPrefixes: readonly string[];
  dependsOn?: readonly string[];
  contexts?: readonly string[];
  deterministic: boolean;
  cacheable: boolean;
  cost: TaskCostClass;
}

export interface TaskGraph {
  capabilities: ReadonlyMap<string, TaskCapability>;
  dependencies: ReadonlyMap<string, readonly string[]>;
  dependents: ReadonlyMap<string, readonly string[]>;
}

export interface AffectedTaskSet {
  changedPaths: readonly string[];
  directCapabilityIds: readonly string[];
  affectedCapabilityIds: readonly string[];
  unmatchedPaths: readonly string[];
}

export interface TaskExecutionPlanInput {
  graph: TaskGraph;
  affected: AffectedTaskSet;
  context?: string;
  targetCapabilityIds?: readonly string[];
  reusableCapabilityIds?: readonly string[];
}

export interface TaskExecutionPlan {
  status: "ready" | "blocked";
  selectedCapabilityIds: readonly string[];
  skippedCapabilityIds: readonly string[];
  blockedCapabilityIds: readonly string[];
  reasons: readonly string[];
}
