import type { McStructureModel } from "./types.js";
import { extractStructureRuntimeContent } from "./runtime-content.js";

export interface McStructureSemantics {
  entityCount: number;
  hasEntities: boolean;
  paletteSize: number;
  hasBlockPositionData: boolean;
  commandBlockPaletteEntries: number;
  containerPaletteEntries: number;
  embeddedCommandBlocks: number;
  queuedTickPositions: number;
}

const COMMAND_BLOCK_NAMES = new Set([
  "minecraft:command_block",
  "minecraft:chain_command_block",
  "minecraft:repeating_command_block",
]);

const CONTAINER_HINTS = [
  "chest",
  "barrel",
  "hopper",
  "dispenser",
  "dropper",
  "furnace",
  "shulker_box",
];

export function deriveMcStructureSemantics(
  structure: McStructureModel,
): McStructureSemantics {
  let commandBlockPaletteEntries = 0;
  let containerPaletteEntries = 0;

  for (const entry of structure.palette) {
    const name = entry.name ?? "";
    if (COMMAND_BLOCK_NAMES.has(name)) commandBlockPaletteEntries += 1;
    if (CONTAINER_HINTS.some((hint) => name.includes(hint))) {
      containerPaletteEntries += 1;
    }
  }

  const runtime = extractStructureRuntimeContent(structure);

  return {
    entityCount: structure.entities.length,
    hasEntities: structure.entities.length > 0,
    paletteSize: structure.palette.length,
    hasBlockPositionData: structure.blockPositionData !== undefined,
    commandBlockPaletteEntries,
    containerPaletteEntries,
    embeddedCommandBlocks: runtime.commandBlocks.length,
    queuedTickPositions: runtime.queuedTickPositions,
  };
}
