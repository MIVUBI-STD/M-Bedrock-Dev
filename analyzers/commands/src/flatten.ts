import type { CommandAnalysis, CommandEffect } from "./effects.js";

export function flattenCommandEffects(analysis: CommandAnalysis): CommandEffect[] {
  const flattened: CommandEffect[] = [];

  for (const effect of analysis.effects) {
    flattened.push(effect);
    if (effect.kind === "nested-command") {
      flattened.push(...flattenCommandEffects(effect.nested));
    }
  }

  return flattened;
}
