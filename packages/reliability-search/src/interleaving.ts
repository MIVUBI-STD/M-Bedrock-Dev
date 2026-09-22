import { createHash } from "node:crypto";

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
}

export interface InterleavingResult<T> {
  schedules: ScheduledOperation<T>[][];
  exploredPermutations: number;
  reducedEquivalentSchedules: number;
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

function canonicalTraceKey<T>(
  schedule: readonly ScheduledOperation<T>[],
): string {
  const ids = schedule.map((operation) => operation.id);

  // Bubble independent adjacent operations into stable id order.
  // Equivalent schedules under declared commutativity collapse to one trace.
  let changed = true;
  while (changed) {
    changed = false;
    for (let index = 0; index + 1 < ids.length; index += 1) {
      const leftId = ids[index]!;
      const rightId = ids[index + 1]!;
      const left = schedule.find((item) => item.id === leftId)!;
      const right = schedule.find((item) => item.id === rightId)!;
      if (operationsIndependent(left, right) && leftId.localeCompare(rightId) > 0) {
        ids[index] = rightId;
        ids[index + 1] = leftId;
        changed = true;
      }
    }
  }

  return createHash("sha256").update(ids.join("\u0000")).digest("hex");
}

export function exploreInterleavings<T>(
  operations: readonly ScheduledOperation<T>[],
  options: InterleavingOptions,
): InterleavingResult<T> {
  const schedules: ScheduledOperation<T>[][] = [];
  const canonical = new Set<string>();
  let exploredPermutations = 0;
  let reducedEquivalentSchedules = 0;
  let truncated = false;

  const visit = (
    prefix: ScheduledOperation<T>[],
    remaining: ScheduledOperation<T>[],
  ) => {
    if (schedules.length >= options.maxSchedules) {
      truncated = remaining.length > 0 || prefix.length < operations.length;
      return;
    }

    if (remaining.length === 0) {
      exploredPermutations += 1;
      const key = canonicalTraceKey(prefix);
      if (canonical.has(key)) {
        reducedEquivalentSchedules += 1;
        return;
      }
      canonical.add(key);
      schedules.push([...prefix]);
      return;
    }

    for (let index = 0; index < remaining.length; index += 1) {
      const next = remaining[index]!;
      visit(
        [...prefix, next],
        remaining.filter((_, itemIndex) => itemIndex !== index),
      );
      if (schedules.length >= options.maxSchedules) {
        truncated = index + 1 < remaining.length || truncated;
        break;
      }
    }
  };

  visit([], [...operations]);

  return {
    schedules,
    exploredPermutations,
    reducedEquivalentSchedules,
    truncated,
  };
}
