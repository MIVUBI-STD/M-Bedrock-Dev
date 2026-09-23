import type { ParsedFunction } from "../../../analyzers/functions/src/types.js";
import { parseStructureLoadSemantics } from "../../../analyzers/commands/src/structure-semantics.js";
import { parseTickingAreaSemantics } from "../../../analyzers/commands/src/tickingarea-semantics.js";

export interface StructureLoadRecord {
  functionId: string;
  line?: number;
  semantics: NonNullable<ReturnType<typeof parseStructureLoadSemantics>>;
}

export interface ChunkLifecycleRecord {
  functionId: string;
  line?: number;
  tickingArea: NonNullable<ReturnType<typeof parseTickingAreaSemantics>>;
}

export function analyzeStructureAndChunkRuntime(
  functions: readonly ParsedFunction[],
) {
  const structureLoads: StructureLoadRecord[] = [];
  const tickingAreas: ChunkLifecycleRecord[] = [];

  for (const fn of functions) {
    for (const command of fn.commands) {
      const line = command.source.range?.lineStart;
      const structure = parseStructureLoadSemantics(command.raw);
      if (structure) {
        structureLoads.push({
          functionId: fn.identifier,
          ...(line ? { line } : {}),
          semantics: structure,
        });
      }

      const tickingArea = parseTickingAreaSemantics(command.raw);
      if (tickingArea) {
        tickingAreas.push({
          functionId: fn.identifier,
          ...(line ? { line } : {}),
          tickingArea,
        });
      }
    }
  }

  return {
    structureLoads,
    tickingAreas,
    probabilisticStructureLoads: structureLoads.filter(
      (item) => item.semantics.integrity !== undefined &&
        item.semantics.integrity < 100,
    ).length,
    structureLoadsExcludingEntities: structureLoads.filter(
      (item) => item.semantics.includeEntities === false,
    ).length,
    preloadedTickingAreas: tickingAreas.filter(
      (item) =>
        (item.tickingArea.action === "add-circle" ||
          item.tickingArea.action === "add-rectangle") &&
        item.tickingArea.preload === true,
    ).length,
  };
}
