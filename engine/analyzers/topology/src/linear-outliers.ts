import type { ResolvedEffect } from "./effect-resolution.js";
import { effectSignature } from "./signature.js";

export interface LinearTopologyOutlier {
  effectIndex: number;
  axis: "x" | "z";
  expectedCoordinate: number;
  actualCoordinate: number;
  step: number;
  sourcePath: string;
}

function dominantStep(values: readonly number[]): number | undefined {
  if (values.length < 4) return undefined;

  const sorted = [...values].sort((a, b) => a - b);
  const deltas = new Map<number, number>();

  for (let i = 1; i < sorted.length; i += 1) {
    const delta = sorted[i]! - sorted[i - 1]!;
    if (delta === 0) continue;
    deltas.set(delta, (deltas.get(delta) ?? 0) + 1);
  }

  const ranked = [...deltas.entries()].sort((a, b) => b[1] - a[1]);
  const best = ranked[0];
  if (!best) return undefined;

  // Require at least two agreeing gaps and a unique dominant step.
  if (best[1] < 2) return undefined;
  if (ranked[1] && ranked[1][1] === best[1]) return undefined;
  return best[0];
}

function anchor(effect: ResolvedEffect) {
  return effectSignature(effect).anchor;
}

export function detectLinearTopologyOutliers(
  effects: readonly ResolvedEffect[],
): LinearTopologyOutlier[] {
  const groups = new Map<string, number[]>();

  effects.forEach((effect, index) => {
    const signature = effectSignature(effect);
    const key = `${signature.kind}:${signature.shapeHash}`;
    const indices = groups.get(key) ?? [];
    indices.push(index);
    groups.set(key, indices);
  });

  const findings: LinearTopologyOutlier[] = [];

  for (const indices of groups.values()) {
    if (indices.length < 4) continue;

    const anchors = indices.map((index) => ({
      index,
      point: anchor(effects[index]!),
    }));

    const sameX = anchors.every((item) => item.point.x === anchors[0]!.point.x);
    const sameZ = anchors.every((item) => item.point.z === anchors[0]!.point.z);
    const sameY = anchors.every((item) => item.point.y === anchors[0]!.point.y);
    if (!sameY) continue;

    const axis: "x" | "z" | undefined =
      sameX && !sameZ ? "z" :
      sameZ && !sameX ? "x" :
      undefined;
    if (!axis) continue;

    const ordered = [...anchors].sort((a, b) => a.point[axis] - b.point[axis]);
    const values = ordered.map((item) => item.point[axis]);
    const step = dominantStep(values);
    if (step === undefined) continue;

    // Find a single point that violates an otherwise regular arithmetic progression.
    for (let i = 1; i < ordered.length - 1; i += 1) {
      const previous = ordered[i - 1]!.point[axis];
      const current = ordered[i]!.point[axis];
      const next = ordered[i + 1]!.point[axis];

      const expectedFromPrevious = previous + step;
      const expectedFromNext = next - step;
      if (
        expectedFromPrevious === expectedFromNext &&
        current !== expectedFromPrevious
      ) {
        const effectIndex = ordered[i]!.index;
        findings.push({
          effectIndex,
          axis,
          expectedCoordinate: expectedFromPrevious,
          actualCoordinate: current,
          step,
          sourcePath: effects[effectIndex]!.sourcePath,
        });
      }
    }
  }

  return findings;
}
