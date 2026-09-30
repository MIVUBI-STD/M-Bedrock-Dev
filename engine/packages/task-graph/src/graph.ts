import type {
  TaskCapability,
  TaskGraph,
} from "./types.js";

function normalizedIds(
  values: readonly string[] | undefined,
): string[] {
  return [...new Set(values ?? [])].sort();
}

export function createTaskGraph(
  capabilities: readonly TaskCapability[],
): TaskGraph {
  const byId = new Map<string, TaskCapability>();

  for (const capability of capabilities) {
    const id = capability.id.trim();
    if (!id) {
      throw new Error("Task capability id must be non-empty.");
    }
    if (byId.has(id)) {
      throw new Error("Duplicate task capability id: " + id);
    }
    if (!capability.owner.trim()) {
      throw new Error(
        "Task capability owner must be non-empty for " + id + ".",
      );
    }

    for (const prefix of capability.pathPrefixes) {
      const wildcardCount =
        [...prefix].filter(
          (character) => character === "*",
        ).length;
      if (
        wildcardCount > 0 &&
        (
          wildcardCount !== 1 ||
          !prefix.endsWith("*") ||
          prefix.length === 1
        )
      ) {
        throw new Error(
          "Task capability " +
            id +
            " path prefix wildcard must be one trailing * after a literal prefix: " +
            prefix +
            ".",
        );
      }
    }

    byId.set(id, {
      ...capability,
      id,
      pathPrefixes: [...new Set(capability.pathPrefixes)].sort(),
      ...(capability.dependsOn === undefined
        ? {}
        : { dependsOn: normalizedIds(capability.dependsOn) }),
      ...(capability.contexts === undefined
        ? {}
        : { contexts: normalizedIds(capability.contexts) }),
    });
  }

  const dependencies = new Map<string, readonly string[]>();
  const dependentsMutable = new Map<string, Set<string>>();

  for (const id of byId.keys()) {
    dependentsMutable.set(id, new Set());
  }

  for (const [id, capability] of byId) {
    const deps = normalizedIds(capability.dependsOn);
    for (const dependencyId of deps) {
      if (!byId.has(dependencyId)) {
        throw new Error(
          "Unknown task dependency " + dependencyId + " required by " + id + ".",
        );
      }
      dependentsMutable.get(dependencyId)?.add(id);
    }
    dependencies.set(id, deps);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) {
      throw new Error("Task graph dependency cycle includes " + id + ".");
    }
    visiting.add(id);
    for (const dependencyId of dependencies.get(id) ?? []) {
      visit(dependencyId);
    }
    visiting.delete(id);
    visited.add(id);
  }

  for (const id of byId.keys()) {
    visit(id);
  }

  const dependents = new Map<string, readonly string[]>();
  for (const [id, values] of dependentsMutable) {
    dependents.set(id, [...values].sort());
  }

  return {
    capabilities: byId,
    dependencies,
    dependents,
  };
}
