import type {
  AffectedTaskSet,
  TaskGraph,
} from "./types.js";

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\//, "");
}

function matchesPrefix(
  path: string,
  prefix: string,
): boolean {
  const normalizedPrefix =
    normalizePath(prefix).replace(/\/$/, "");

  if (normalizedPrefix.endsWith("*")) {
    const literalPrefix =
      normalizedPrefix.slice(0, -1);
    return (
      literalPrefix.length > 0 &&
      path.startsWith(literalPrefix)
    );
  }

  return (
    path === normalizedPrefix ||
    path.startsWith(normalizedPrefix + "/")
  );
}

export function resolveAffectedTasks(
  graph: TaskGraph,
  changedPaths: readonly string[],
): AffectedTaskSet {
  const normalizedPaths =
    [...new Set(changedPaths.map(normalizePath))].sort();
  const direct = new Set<string>();
  const unmatchedPaths: string[] = [];

  for (const path of normalizedPaths) {
    let matched = false;
    for (const capability of graph.capabilities.values()) {
      if (
        capability.pathPrefixes.some((prefix) =>
          matchesPrefix(path, prefix)
        )
      ) {
        direct.add(capability.id);
        matched = true;
      }
    }
    if (!matched) {
      unmatchedPaths.push(path);
    }
  }

  const affected = new Set(direct);
  const queue = [...direct].sort();

  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    for (const dependentId of graph.dependents.get(id) ?? []) {
      if (affected.has(dependentId)) continue;
      affected.add(dependentId);
      queue.push(dependentId);
      queue.sort();
    }
  }

  return {
    changedPaths: normalizedPaths,
    directCapabilityIds: [...direct].sort(),
    affectedCapabilityIds: [...affected].sort(),
    unmatchedPaths,
  };
}
