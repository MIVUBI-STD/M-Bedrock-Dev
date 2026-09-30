import { analyzeCommand } from "../../../analyzers/commands/src/index.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/index.js";
import type { EmbeddedCommandBlock } from "../../../adapters/mcstructure/src/index.js";
import type { SourceRef } from "../../project-model/src/index.js";

export interface EmbeddedStructureCommandAnalysis {
  block: EmbeddedCommandBlock;
  effects: ReturnType<typeof flattenCommandEffects>;
  unknownEffects: number;
}

export function analyzeEmbeddedStructureCommands(
  blocks: readonly EmbeddedCommandBlock[],
  source: SourceRef,
): EmbeddedStructureCommandAnalysis[] {
  return blocks.map((block) => {
    const analysis = analyzeCommand(block.command, source);
    const effects = flattenCommandEffects(analysis);
    return {
      block,
      effects,
      unknownEffects: effects.filter((effect) => effect.kind === "unknown").length,
    };
  });
}
