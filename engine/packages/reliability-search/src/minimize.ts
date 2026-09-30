export interface MinimizeResult<T> {
  minimized: T[];
  evaluations: number;
  originalLength: number;
  minimizedLength: number;
}

export async function ddmin<T>(
  input: readonly T[],
  stillFails: (candidate: readonly T[]) => boolean | Promise<boolean>,
): Promise<MinimizeResult<T>> {
  const originalLength = input.length;
  let current = [...input];
  let evaluations = 0;

  if (!(await stillFails(current))) {
    evaluations += 1;
    throw new Error("ddmin requires an initially failing input.");
  }
  evaluations += 1;

  let granularity = 2;

  while (current.length >= 2) {
    const chunkSize = Math.ceil(current.length / granularity);
    let reduced = false;

    for (let start = 0; start < current.length; start += chunkSize) {
      const candidate = [
        ...current.slice(0, start),
        ...current.slice(Math.min(current.length, start + chunkSize)),
      ];
      if (candidate.length === 0) continue;

      evaluations += 1;
      if (await stillFails(candidate)) {
        current = candidate;
        granularity = Math.max(2, granularity - 1);
        reduced = true;
        break;
      }
    }

    if (reduced) continue;
    if (granularity >= current.length) break;
    granularity = Math.min(current.length, granularity * 2);
  }

  // Final 1-minimal pass.
  let index = 0;
  while (index < current.length) {
    const candidate = current.filter((_, itemIndex) => itemIndex !== index);
    if (candidate.length === 0) {
      index += 1;
      continue;
    }

    evaluations += 1;
    if (await stillFails(candidate)) {
      current = candidate;
      index = 0;
    } else {
      index += 1;
    }
  }

  return {
    minimized: current,
    evaluations,
    originalLength,
    minimizedLength: current.length,
  };
}
