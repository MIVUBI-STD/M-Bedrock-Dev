import type {
  AnalysisExecutionContext,
} from "../../analysis-planner/src/index.js";
import {
  BUILTIN_TASK_CAPABILITIES,
  createTaskGraph,
  planTaskExecution,
  resolveAffectedTasks,
  type AffectedTaskSet,
  type TaskExecutionPlan,
} from "../../task-graph/src/index.js";

export interface RepositoryTaskPlanInput {
  changedPaths: readonly string[];
  context: AnalysisExecutionContext;
  targetCapabilityIds?: readonly string[];
  reusableCapabilityIds?: readonly string[];
}

export interface RepositoryTaskPlan {
  schemaVersion: 1;
  status:
    | "planned"
    | "fallback-required";
  affected: AffectedTaskSet;
  execution: TaskExecutionPlan;
  reasons: readonly string[];
}

export function planRepositoryTasks(
  input: RepositoryTaskPlanInput,
): RepositoryTaskPlan {
  const graph =
    createTaskGraph(
      BUILTIN_TASK_CAPABILITIES,
    );
  const affected =
    resolveAffectedTasks(
      graph,
      input.changedPaths,
    );
  const execution =
    planTaskExecution({
      graph,
      affected,
      context: input.context,
      ...(input.targetCapabilityIds ===
      undefined
        ? {}
        : {
            targetCapabilityIds:
              input.targetCapabilityIds,
          }),
      ...(input.reusableCapabilityIds ===
      undefined
        ? {}
        : {
            reusableCapabilityIds:
              input.reusableCapabilityIds,
          }),
    });

  const fallbackRequired =
    affected.unmatchedPaths.length > 0;

  return {
    schemaVersion: 1,
    status: fallbackRequired
      ? "fallback-required"
      : "planned",
    affected,
    execution,
    reasons: [
      fallbackRequired
        ? "Selective repository execution is not authoritative because one or more changed paths have no registered capability owner; use the conservative full/fallback path for those changes."
        : "Every changed path is owned by the builtin task graph; affected-only execution may be used subject to the execution plan.",
      execution.status === "blocked"
        ? "One or more affected tasks are blocked by dependency or execution-context requirements."
        : "Affected tasks are executable in dependency order for the requested context.",
    ],
  };
}
