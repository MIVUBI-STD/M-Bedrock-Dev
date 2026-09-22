import type { ResolvedEffect } from "./effect-resolution.js";
import { effectSignature, translationBetween, type Translation3 } from "./signature.js";

export interface RepeatedEffectPair {
  sourceIndex: number;
  targetIndex: number;
  translation: Translation3;
}

export function findRepeatedTranslatedEffects(
  effects: readonly ResolvedEffect[],
): RepeatedEffectPair[] {
  const signatures = effects.map(effectSignature);
  const pairs: RepeatedEffectPair[] = [];

  for (let i = 0; i < signatures.length; i += 1) {
    for (let j = i + 1; j < signatures.length; j += 1) {
      const translation = translationBetween(signatures[i]!, signatures[j]!);
      if (translation) pairs.push({ sourceIndex: i, targetIndex: j, translation });
    }
  }
  return pairs;
}
