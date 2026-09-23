import type { ParsedFunction } from "../../../analyzers/functions/src/types.js";
import { parseStructureLoadSemantics } from "../../../analyzers/commands/src/structure-semantics.js";
import { parseTickingAreaSemantics } from "../../../analyzers/commands/src/tickingarea-semantics.js";
import { parseScheduleAreaLoadedSemantics } from "../../../analyzers/commands/src/schedule-semantics.js";
import type { McStructureSemantics } from "../../../adapters/mcstructure/src/semantics.js";
import type { StructureSize } from "../../../adapters/mcstructure/src/types.js";

function absoluteBlockPosition(
  position: NonNullable<ReturnType<typeof parseStructureLoadSemantics>>["position"],
): { x: number; y: number; z: number } | undefined {
  if (!position) return undefined;
  if (
    position.x.mode !== "absolute" ||
    position.y.mode !== "absolute" ||
    position.z.mode !== "absolute"
  ) return undefined;
  return {
    x: position.x.value,
    y: position.y.value,
    z: position.z.value,
  };
}

function blockToChunk(value: number): number {
  return Math.floor(value / 16);
}

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

export interface AreaLoadedScheduleRecord {
  functionId: string;
  line?: number;
  schedule: NonNullable<ReturnType<typeof parseScheduleAreaLoadedSemantics>>;
}

export interface ParsedStructureSummary {
  identifier: string;
  relativePath: string;
  size?: StructureSize;
  semantics: McStructureSemantics;
}

export interface StructureLoadCorrelation {
  load: StructureLoadRecord;
  status: "resolved" | "missing" | "ambiguous";
  candidates: ParsedStructureSummary[];
  findings: Array<
    | "entities-excluded"
    | "blocks-excluded"
    | "probabilistic-command-block-load"
    | "probabilistic-container-load"
    | "runtime-logic-content"
  >;
}

function correlateStructureLoad(
  load: StructureLoadRecord,
  structures: readonly ParsedStructureSummary[],
): StructureLoadCorrelation {
  const candidates = structures.filter(
    (structure) => structure.identifier === load.semantics.name,
  );

  if (candidates.length === 0) {
    return { load, status: "missing", candidates: [], findings: [] };
  }
  if (candidates.length > 1) {
    return { load, status: "ambiguous", candidates, findings: [] };
  }

  const structure = candidates[0]!;
  const findings: StructureLoadCorrelation["findings"] = [];

  if (
    load.semantics.includeEntities === false &&
    structure.semantics.hasEntities
  ) {
    findings.push("entities-excluded");
  }
  if (
    load.semantics.includeBlocks === false &&
    structure.semantics.paletteSize > 0
  ) {
    findings.push("blocks-excluded");
  }

  const probabilistic =
    load.semantics.integrity !== undefined &&
    load.semantics.integrity < 100;

  if (
    probabilistic &&
    structure.semantics.commandBlockPaletteEntries > 0
  ) {
    findings.push("probabilistic-command-block-load");
  }
  if (
    probabilistic &&
    structure.semantics.containerPaletteEntries > 0
  ) {
    findings.push("probabilistic-container-load");
  }
  if (structure.semantics.commandBlockPaletteEntries > 0) {
    findings.push("runtime-logic-content");
  }

  return {
    load,
    status: "resolved",
    candidates,
    findings,
  };
}

export function analyzeStructureAndChunkRuntime(
  functions: readonly ParsedFunction[],
  structures: readonly ParsedStructureSummary[] = [],
) {
  const structureLoads: StructureLoadRecord[] = [];
  const tickingAreas: ChunkLifecycleRecord[] = [];
  const areaLoadedSchedules: AreaLoadedScheduleRecord[] = [];

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

      const schedule = parseScheduleAreaLoadedSemantics(command.raw);
      if (schedule) {
        areaLoadedSchedules.push({
          functionId: fn.identifier,
          ...(line ? { line } : {}),
          schedule,
        });
      }
    }
  }

  const correlations = structureLoads.map((load) =>
    correlateStructureLoad(load, structures)
  );
  const absoluteLoadDestinations = structureLoads.flatMap((load) => {
    const block = absoluteBlockPosition(load.semantics.position);
    if (!block) return [];
    return [{
      target: load.semantics.name,
      chunkX: blockToChunk(block.x),
      chunkZ: blockToChunk(block.z),
      functionId: load.functionId,
      ...(load.line !== undefined ? { line: load.line } : {}),
    }];
  });

  return {
    structureLoads,
    tickingAreas,
    areaLoadedSchedules,
    correlations,
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
    unresolvedStructureLoads: correlations.filter(
      (item) => item.status !== "resolved",
    ).length,
    runtimeLogicStructureLoads: correlations.filter(
      (item) => item.findings.includes("runtime-logic-content"),
    ).length,
    absoluteLoadDestinations,
    chunkLifecycleEvidence: {
      tickingAreas: tickingAreas.length,
      preloadedTickingAreas: tickingAreas.filter(
        (item) =>
          (item.tickingArea.action === "add-circle" ||
            item.tickingArea.action === "add-rectangle") &&
          item.tickingArea.preload === true,
      ).length,
      areaLoadedSchedules: areaLoadedSchedules.length,
    },
  };
}
