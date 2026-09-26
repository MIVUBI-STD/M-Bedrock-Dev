import {
  happensBefore,
  operationIsEnabledByHappensBefore,
  validateConcurrencySemantics,
  type ConcurrencySemantics,
  type HappensBeforeEdge,
} from "./happens-before.js";

export interface OperationFootprint {
  reads: readonly string[];
  writes: readonly string[];
  /**
   * Engine/runtime surfaces that may create implicit dependency outside
   * declared state reads/writes.
   */
  semanticSurfaces?: readonly string[];
}

export interface OperationCausalContext {
  /**
   * Explicit causal parents. These become happens-before edges.
   */
  parentOperationIds?: readonly string[];
  /**
   * Lifetime/generation identities such as player connection generation,
   * arena generation, entity generation, or subsystem generation.
   *
   * Different values for the same generation key imply dependency, but do
   * not by themselves imply ordering.
   */
  generationTokens?: Readonly<Record<string, string | number>>;
}

export interface ScheduledOperation<T> {
  id: string;
  value: T;
  footprint: OperationFootprint;
  causal?: OperationCausalContext;
}

export interface InterleavingOptions {
  maxSchedules: number;
  maxExploredNodes?: number;
  concurrency?: ConcurrencySemantics;
}

export interface InterleavingResult<T> {
  schedules: ScheduledOperation<T>[][];
  exploredNodes: number;
  reducedEquivalentBranches: number;
  blockedByHappensBefore: number;
  generationDependencyPairs: number;
  truncated: boolean;
}

function intersects(
  a: readonly string[],
  b: ReadonlySet<string>,
): boolean {
  return a.some((value) => b.has(value));
}

function sharesHiddenDependencySurface<T>(
  a: ScheduledOperation<T>,
  b: ScheduledOperation<T>,
  semantics: ConcurrencySemantics | undefined,
): boolean {
  const hidden = new Set(
    semantics?.hiddenDependencySurfaces ?? [],
  );
  if (hidden.size === 0) return false;

  const aSurfaces = new Set(
    (a.footprint.semanticSurfaces ?? [])
      .filter((surface) => hidden.has(surface)),
  );
  return (b.footprint.semanticSurfaces ?? [])
    .some((surface) => aSurfaces.has(surface));
}

export function operationsHaveGenerationConflict<T>(
  a: ScheduledOperation<T>,
  b: ScheduledOperation<T>,
): boolean {
  const left = a.causal?.generationTokens;
  const right = b.causal?.generationTokens;
  if (!left || !right) return false;

  for (const key of Object.keys(left)) {
    const leftValue = left[key];
    const rightValue = right[key];
    if (
      rightValue !== undefined &&
      leftValue !== rightValue
    ) {
      return true;
    }
  }

  return false;
}

function effectiveConcurrencySemantics<T>(
  operations: readonly ScheduledOperation<T>[],
  declared: ConcurrencySemantics | undefined,
): ConcurrencySemantics {
  const edges = new Map<string, HappensBeforeEdge>();

  for (const edge of declared?.happensBefore ?? []) {
    edges.set(
      edge.before + "->" + edge.after,
      edge,
    );
  }

  for (const operation of operations) {
    for (
      const parent of
        operation.causal?.parentOperationIds ?? []
    ) {
      const edge: HappensBeforeEdge = {
        before: parent,
        after: operation.id,
        reason: "causal-parent",
      };
      const key =
        edge.before + "->" + edge.after;
      if (!edges.has(key)) {
        edges.set(key, edge);
      }
    }
  }

  return {
    ...(edges.size === 0
      ? {}
      : {
          happensBefore: [
            ...edges.values(),
          ],
        }),
    ...(declared?.hiddenDependencySurfaces ===
      undefined
      ? {}
      : {
          hiddenDependencySurfaces:
            declared.hiddenDependencySurfaces,
        }),
  };
}

export function operationsIndependent<T>(
  a: ScheduledOperation<T>,
  b: ScheduledOperation<T>,
  semantics?: ConcurrencySemantics,
): boolean {
  if (
    happensBefore(a.id, b.id, semantics) ||
    happensBefore(b.id, a.id, semantics)
  ) {
    return false;
  }

  if (
    operationsHaveGenerationConflict(a, b)
  ) {
    return false;
  }

  if (
    sharesHiddenDependencySurface(
      a,
      b,
      semantics,
    )
  ) {
    return false;
  }

  const aWrites = new Set(a.footprint.writes);
  const bWrites = new Set(b.footprint.writes);
  return !intersects(a.footprint.writes, bWrites) &&
    !intersects(
      a.footprint.writes,
      new Set(b.footprint.reads),
    ) &&
    !intersects(
      b.footprint.writes,
      new Set(a.footprint.reads),
    ) &&
    !intersects(b.footprint.writes, aWrites);
}

function assertUniqueOperationIds<T>(
  operations: readonly ScheduledOperation<T>[],
): void {
  const seen = new Set<string>();
  for (const operation of operations) {
    if (seen.has(operation.id)) {
      throw new Error(
        "Interleaving operation ids must be unique: " +
          operation.id,
      );
    }
    seen.add(operation.id);
  }
}

function branchIsEquivalentToEarlierChoice<T>(
  remaining: readonly ScheduledOperation<T>[],
  index: number,
  semantics: ConcurrencySemantics | undefined,
): boolean {
  const candidate = remaining[index]!;
  for (
    let earlierIndex = 0;
    earlierIndex < index;
    earlierIndex += 1
  ) {
    const earlier = remaining[earlierIndex]!;
    if (
      earlier.id.localeCompare(candidate.id) < 0 &&
      operationsIndependent(
        earlier,
        candidate,
        semantics,
      )
    ) {
      return true;
    }
  }
  return false;
}

export function exploreInterleavings<T>(
  operations: readonly ScheduledOperation<T>[],
  options: InterleavingOptions,
): InterleavingResult<T> {
  if (
    !Number.isInteger(options.maxSchedules) ||
    options.maxSchedules < 1
  ) {
    throw new Error(
      "maxSchedules must be a positive integer.",
    );
  }
  const maxExploredNodes =
    options.maxExploredNodes ?? 100_000;
  if (
    !Number.isInteger(maxExploredNodes) ||
    maxExploredNodes < 1
  ) {
    throw new Error(
      "maxExploredNodes must be a positive integer.",
    );
  }

  assertUniqueOperationIds(operations);
  const operationIds = new Set(
    operations.map((item) => item.id),
  );
  const concurrency =
    effectiveConcurrencySemantics(
      operations,
      options.concurrency,
    );
  const semanticErrors =
    validateConcurrencySemantics(
      operationIds,
      concurrency,
    );
  if (semanticErrors.length > 0) {
    throw new Error(
      "Invalid concurrency semantics: " +
        semanticErrors.join("; "),
    );
  }

  const generationDependencyPairs =
    operations.reduce(
      (count, operation, index) =>
        count +
        operations
          .slice(index + 1)
          .filter((other) =>
            operationsHaveGenerationConflict(
              operation,
              other,
            )
          ).length,
      0,
    );

  const schedules: ScheduledOperation<T>[][] = [];
  let exploredNodes = 0;
  let reducedEquivalentBranches = 0;
  let blockedByHappensBefore = 0;
  let truncated = false;

  const visit = (
    prefix: ScheduledOperation<T>[],
    remaining: ScheduledOperation<T>[],
  ): void => {
    if (
      schedules.length >= options.maxSchedules ||
      exploredNodes >= maxExploredNodes
    ) {
      truncated = remaining.length > 0;
      return;
    }

    exploredNodes += 1;

    if (remaining.length === 0) {
      schedules.push([...prefix]);
      return;
    }

    const ordered = [...remaining].sort(
      (a, b) => a.id.localeCompare(b.id),
    );
    const scheduledIds = new Set(
      prefix.map((item) => item.id),
    );

    for (
      let index = 0;
      index < ordered.length;
      index += 1
    ) {
      const next = ordered[index]!;

      if (
        !operationIsEnabledByHappensBefore(
          next.id,
          scheduledIds,
          concurrency,
        )
      ) {
        blockedByHappensBefore += 1;
        continue;
      }

      if (
        branchIsEquivalentToEarlierChoice(
          ordered,
          index,
          concurrency,
        )
      ) {
        reducedEquivalentBranches += 1;
        continue;
      }

      visit(
        [...prefix, next],
        ordered.filter(
          (_, itemIndex) =>
            itemIndex !== index,
        ),
      );

      if (
        schedules.length >= options.maxSchedules ||
        exploredNodes >= maxExploredNodes
      ) {
        truncated =
          index + 1 < ordered.length ||
          truncated;
        break;
      }
    }
  };

  visit([], [...operations]);

  return {
    schedules,
    exploredNodes,
    reducedEquivalentBranches,
    blockedByHappensBefore,
    generationDependencyPairs,
    truncated,
  };
}
