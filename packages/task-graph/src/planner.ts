import type {
  TaskExecutionPlan,
  TaskExecutionPlanInput,
  TaskGraph,
} from "./types.js";

function dependencyClosure(
  graph: TaskGraph,
  ids: readonly string[],
): Set<string> {
  const result = new Set<string>();

  function add(id: string): void {
    if (result.has(id)) return;
    if (!graph.capabilities.has(id)) {
      throw new Error("Unknown task capability target: " + id);
    }
    result.add(id);
    for (const dependencyId of graph.dependencies.get(id) ?? []) {
      add(dependencyId);
    }
  }

  for (const id of ids) add(id);
  return result;
}

function topologicalOrder(
  graph: TaskGraph,
  selected: ReadonlySet<string>,
): string[] {
  const ordered: string[] = [];
  const visited = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id)) return;
    visited.add(id);
    for (const dependencyId of graph.dependencies.get(id) ?? []) {
      if (selected.has(dependencyId)) {
        visit(dependencyId);
      }
    }
    ordered.push(id);
  }

  for (const id of [...selected].sort()) {
    visit(id);
  }
  return ordered;
}

export function planTaskExecution(
  input: TaskExecutionPlanInput,
): TaskExecutionPlan {
  const affected = new Set(input.affected.affectedCapabilityIds);
  const reusable = new Set(input.reusableCapabilityIds ?? []);

  const requested =
    input.targetCapabilityIds === undefined
      ? affected
      : dependencyClosure(input.graph, input.targetCapabilityIds);

  const selected = new Set<string>();
  const blocked = new Set<string>();
  const skipped = new Set<string>();

  for (const [id, capability] of input.graph.capabilities) {
    const inScope = requested.has(id) && affected.has(id);
    if (!inScope) {
      skipped.add(id);
      continue;
    }

    if (
      input.context !== undefined &&
      capability.contexts !== undefined &&
      !capability.contexts.includes(input.context)
    ) {
      blocked.add(id);
      continue;
    }

    if (reusable.has(id) && capability.cacheable) {
      skipped.add(id);
      continue;
    }

    selected.add(id);
  }

  // A selected task cannot execute when a required affected dependency is
  // blocked by execution context or unavailable scope.
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of [...selected]) {
      for (const dependencyId of input.graph.dependencies.get(id) ?? []) {
        if (!affected.has(dependencyId)) continue;
        if (blocked.has(dependencyId)) {
          selected.delete(id);
          blocked.add(id);
          changed = true;
          break;
        }
        const dep = input.graph.capabilities.get(dependencyId);
        if (
          !selected.has(dependencyId) &&
          !(
            reusable.has(dependencyId) &&
            dep?.cacheable === true
          )
        ) {
          selected.delete(id);
          blocked.add(id);
          changed = true;
          break;
        }
      }
    }
  }

  const selectedCapabilityIds =
    topologicalOrder(input.graph, selected);
  const blockedCapabilityIds = [...blocked].sort();

  return {
    status:
      blockedCapabilityIds.length === 0
        ? "ready"
        : "blocked",
    selectedCapabilityIds,
    skippedCapabilityIds: [...skipped].sort(),
    blockedCapabilityIds,
    reasons: [
      input.affected.unmatchedPaths.length === 0
        ? "All changed paths matched at least one registered capability."
        : String(input.affected.unmatchedPaths.length) +
          " changed path(s) are not yet owned by the task graph; callers must use a conservative fallback for them.",
      selectedCapabilityIds.length === 0
        ? "No non-reusable affected capability remains to execute."
        : String(selectedCapabilityIds.length) +
          " capability task(s) remain after affected and reuse filtering.",
      blockedCapabilityIds.length === 0
        ? "No selected capability is blocked by the current execution context."
        : String(blockedCapabilityIds.length) +
          " capability task(s) are blocked by dependency or execution context.",
    ],
  };
}
