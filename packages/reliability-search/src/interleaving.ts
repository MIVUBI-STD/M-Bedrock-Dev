export interface OperationFootprint {
  reads: readonly string[];
  writes: readonly string[];
}

export interface ScheduledOperation<T> {
  id: string;
  value: T;
  footprint: OperationFootprint;
}

export interface InterleavingOptions {
  maxSchedules: number;
  maxExploredNodes?: number;
}

export interface InterleavingResult<T> {
  schedules: ScheduledOperation<T>[][];
  exploredNodes: number;
  reducedEquivalentBranches: number;
  truncated: boolean;
}

function intersects(a: readonly string[], b: ReadonlySet<string>): boolean {
  return a.some((value) => b.has(value));
}

export function operationsIndependent<T>(
  a: ScheduledOperation<T>,
  b: ScheduledOperation<T>,
): boolean {
  const aWrites = new Set(a.footprint.writes);
  const bWrites = new Set(b.footprint.writes);
  return !intersects(a.footprint.writes, bWrites) &&
    !intersects(a.footprint.writes, new Set(b.footprint.reads)) &&
    !intersects(b.footprint.writes, new Set(a.footprint.reads)) &&
    !intersects(b.footprint.writes, aWrites);
}

function assertUniqueOperationIds<T>(
  operations: readonly ScheduledOperation<T>[],
): void {
  const seen = new Set<string>();
  for (const operation of operations) {
    if (seen.has(operation.id)) {
      throw new Error(`Interleaving operation ids must be unique: ${operation.id}`);
    }
    seen.add(operation.id);
  }
}

function branchIsEquivalentToEarlierChoice<T>(
  remaining: readonly ScheduledOperation<T>[],
  index: number,
): boolean {
  const candidate = remaining[index]!;
  for (let earlierIndex = 0; earlierIndex < index; earlierIndex += 1) {
    const earlier = remaining[earlierIndex]!;
    if (
      earlier.id.localeCompare(candidate.id) < 0 &&
      operationsIndependent(earlier, candidate)
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
  if (!Number.isInteger(options.maxSchedules) || options.maxSchedules < 1) {
    throw new Error("maxSchedules must be a positive integer.");
  }
  const maxExploredNodes = options.maxExploredNodes ?? 100_000;
  if (!Number.isInteger(maxExploredNodes) || maxExploredNodes < 1) {
    throw new Error("maxExploredNodes must be a positive integer.");
  }

  assertUniqueOperationIds(operations);

  const schedules: ScheduledOperation<T>[][] = [];
  let exploredNodes = 0;
  let reducedEquivalentBranches = 0;
  let truncated = false;

  const visit = (
    prefix: ScheduledOperation<T>[],
    remaining: ScheduledOperation<T>[],
  ): void => {
    if (schedules.length >= options.maxSchedules || exploredNodes >= maxExploredNodes) {
      truncated = remaining.length > 0;
      return;
    }

    exploredNodes += 1;

    if (remaining.length === 0) {
      schedules.push([...prefix]);
      return;
    }

    const ordered = [...remaining].sort((a, b) => a.id.localeCompare(b.id));

    for (let index = 0; index < ordered.length; index += 1) {
      if (branchIsEquivalentToEarlierChoice(ordered, index)) {
        reducedEquivalentBranches += 1;
        continue;
      }

      const next = ordered[index]!;
      visit(
        [...prefix, next],
        ordered.filter((_, itemIndex) => itemIndex !== index),
      );

      if (schedules.length >= options.maxSchedules || exploredNodes >= maxExploredNodes) {
        truncated = index + 1 < ordered.length || truncated;
        break;
      }
    }
  };

  visit([], [...operations]);

  return {
    schedules,
    exploredNodes,
    reducedEquivalentBranches,
    truncated,
  };
}
