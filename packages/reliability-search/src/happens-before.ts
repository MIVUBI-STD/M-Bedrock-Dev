export type HappensBeforeReason =
  | "program-order"
  | "causal-parent"
  | "generation-order"
  | "event-delivery"
  | "explicit-contract";

export interface HappensBeforeEdge {
  before: string;
  after: string;
  reason: HappensBeforeReason;
  evidenceIds?: readonly string[];
}

export interface ConcurrencySemantics {
  happensBefore?: readonly HappensBeforeEdge[];
  /**
   * Shared hidden engine surfaces force dependency even when declared
   * read/write footprints do not overlap.
   */
  hiddenDependencySurfaces?: readonly string[];
}

function cycleInGraph(
  edges: readonly HappensBeforeEdge[],
): readonly string[] | undefined {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.before) ?? [];
    list.push(edge.after);
    adjacency.set(edge.before, list);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  const visit = (
    node: string,
  ): readonly string[] | undefined => {
    if (visited.has(node)) return undefined;
    if (visiting.has(node)) {
      const index = stack.indexOf(node);
      return [
        ...stack.slice(index),
        node,
      ];
    }

    visiting.add(node);
    stack.push(node);

    for (
      const next of adjacency.get(node) ?? []
    ) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }

    stack.pop();
    visiting.delete(node);
    visited.add(node);
    return undefined;
  };

  for (const node of adjacency.keys()) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }

  return undefined;
}

export function validateConcurrencySemantics(
  operationIds: ReadonlySet<string>,
  semantics: ConcurrencySemantics,
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const edge of semantics.happensBefore ?? []) {
    if (!operationIds.has(edge.before)) {
      errors.push(
        "Happens-before edge references unknown before operation: " +
          edge.before +
          ".",
      );
    }
    if (!operationIds.has(edge.after)) {
      errors.push(
        "Happens-before edge references unknown after operation: " +
          edge.after +
          ".",
      );
    }
    if (edge.before === edge.after) {
      errors.push(
        "Happens-before edge cannot self-reference: " +
          edge.before +
          ".",
      );
    }
    const key = edge.before + "->" + edge.after;
    if (seen.has(key)) {
      errors.push(
        "Duplicate happens-before edge: " +
          key +
          ".",
      );
    }
    seen.add(key);
  }

  const cycle = cycleInGraph(
    semantics.happensBefore ?? [],
  );
  if (cycle) {
    errors.push(
      "Happens-before graph contains a cycle: " +
        cycle.join(" -> ") +
        ".",
    );
  }

  return errors;
}

export function happensBefore(
  beforeId: string,
  afterId: string,
  semantics: ConcurrencySemantics | undefined,
): boolean {
  if (!semantics?.happensBefore?.length) {
    return false;
  }

  const adjacency = new Map<string, string[]>();
  for (const edge of semantics.happensBefore) {
    const list = adjacency.get(edge.before) ?? [];
    list.push(edge.after);
    adjacency.set(edge.before, list);
  }

  const visited = new Set<string>();
  const queue = [
    ...(adjacency.get(beforeId) ?? []),
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === afterId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    queue.push(
      ...(adjacency.get(current) ?? []),
    );
  }

  return false;
}

export function operationIsEnabledByHappensBefore(
  operationId: string,
  scheduledIds: ReadonlySet<string>,
  semantics: ConcurrencySemantics | undefined,
): boolean {
  for (
    const edge of
      semantics?.happensBefore ?? []
  ) {
    if (
      edge.after === operationId &&
      !scheduledIds.has(edge.before)
    ) {
      return false;
    }
  }
  return true;
}
