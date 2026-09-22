import type { ResolvedEffect } from "./effect-resolution.js";
import { effectSignature, translationBetween, type Translation3 } from "./signature.js";

export interface ExpectedTranslation {
  sourceIndex: number;
  targetIndex: number;
  expected: Translation3;
  actual?: Translation3;
  status: "match" | "outlier" | "not-comparable";
}

export function compareExpectedTranslation(
  effects: readonly ResolvedEffect[],
  sourceIndex: number,
  targetIndex: number,
  expected: Translation3,
): ExpectedTranslation {
  const source = effects[sourceIndex];
  const target = effects[targetIndex];
  if (!source || !target) {
    return { sourceIndex, targetIndex, expected, status: "not-comparable" };
  }

  const actual = translationBetween(effectSignature(source), effectSignature(target));
  if (!actual) {
    return { sourceIndex, targetIndex, expected, status: "not-comparable" };
  }

  const status =
    actual.x === expected.x && actual.y === expected.y && actual.z === expected.z
      ? "match"
      : "outlier";

  return { sourceIndex, targetIndex, expected, actual, status };
}
