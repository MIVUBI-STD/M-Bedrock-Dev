import type { RuntimeEvidenceRecord } from "../../project-model/src/index.js";
import type { SourceRef } from "../../project-model/src/index.js";
import type { ParsedFunction } from "../../../analyzers/functions/src/index.js";
import { flattenCommandEffects } from "../../../analyzers/commands/src/index.js";
import type { CommandEffect } from "../../../analyzers/commands/src/index.js";
import type { Coordinate3 } from "../../../analyzers/commands/src/index.js";
import type { analyzeStructureAndChunkRuntime } from "./structure-runtime-analysis.js";

type StructureRuntimeAnalysis = ReturnType<typeof analyzeStructureAndChunkRuntime>;

interface ChunkBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function absolute(coordinate: Coordinate3): { x: number; y: number; z: number } | undefined {
  if (
    coordinate.x.mode !== "absolute" ||
    coordinate.y.mode !== "absolute" ||
    coordinate.z.mode !== "absolute"
  ) return undefined;
  return {
    x: coordinate.x.value,
    y: coordinate.y.value,
    z: coordinate.z.value,
  };
}

function chunk(value: number): number {
  return Math.floor(value / 16);
}

function coordinateBounds(coordinate: Coordinate3): ChunkBounds | undefined {
  const value = absolute(coordinate);
  if (!value) return undefined;
  return {
    minX: chunk(value.x),
    maxX: chunk(value.x),
    minZ: chunk(value.z),
    maxZ: chunk(value.z),
  };
}

function regionBounds(from: Coordinate3, to: Coordinate3): ChunkBounds | undefined {
  const a = absolute(from);
  const b = absolute(to);
  if (!a || !b) return undefined;
  return {
    minX: chunk(Math.min(a.x, b.x)),
    maxX: chunk(Math.max(a.x, b.x)),
    minZ: chunk(Math.min(a.z, b.z)),
    maxZ: chunk(Math.max(a.z, b.z)),
  };
}

function effectBounds(effect: CommandEffect): ChunkBounds | undefined {
  if (effect.kind === "setblock") return coordinateBounds(effect.position);
  if (effect.kind === "fill") return regionBounds(effect.region.from, effect.region.to);
  return undefined;
}

function scheduleArea(
  runtime: StructureRuntimeAnalysis,
  schedule: StructureRuntimeAnalysis["areaLoadedSchedules"][number]["schedule"],
): ChunkBounds | undefined {
  if (schedule.kind === "rectangle") {
    return regionBounds(schedule.from, schedule.to);
  }
  if (schedule.kind === "circle") {
    const center = absolute(schedule.center);
    if (!center) return undefined;
    const centerX = chunk(center.x);
    const centerZ = chunk(center.z);
    return {
      minX: centerX - schedule.radius,
      maxX: centerX + schedule.radius,
      minZ: centerZ - schedule.radius,
      maxZ: centerZ + schedule.radius,
    };
  }
  if (schedule.kind === "tickingarea") {
    const matches = runtime.tickingAreas.filter((item) =>
      (item.tickingArea.action === "add-rectangle" ||
        item.tickingArea.action === "add-circle") &&
      item.tickingArea.name === schedule.tickingAreaName
    );
    if (matches.length !== 1) return undefined;
    const ticking = matches[0]!.tickingArea;
    if (ticking.action === "add-rectangle") {
      return regionBounds(ticking.from, ticking.to);
    }
    if (ticking.action === "add-circle") {
      const center = absolute(ticking.center);
      if (!center) return undefined;
      const centerX = chunk(center.x);
      const centerZ = chunk(center.z);
      return {
        minX: centerX - ticking.radius,
        maxX: centerX + ticking.radius,
        minZ: centerZ - ticking.radius,
        maxZ: centerZ + ticking.radius,
      };
    }
  }
  return undefined;
}

function covers(area: ChunkBounds, target: ChunkBounds): boolean {
  return (
    area.minX <= target.minX &&
    area.maxX >= target.maxX &&
    area.minZ <= target.minZ &&
    area.maxZ >= target.maxZ
  );
}

function operationId(source: SourceRef): string {
  return source.artifactId + ":" + source.relativePath + ":" + (source.range?.lineStart ?? 0);
}

export function areaLoadedBlockWriteEvidence(
  runtime: StructureRuntimeAnalysis,
  functions: readonly ParsedFunction[],
): RuntimeEvidenceRecord[] {
  const schedulesByFunction = new Map<string, ChunkBounds[]>();

  for (const item of runtime.areaLoadedSchedules) {
    const area = scheduleArea(runtime, item.schedule);
    if (!area) continue;
    const list = schedulesByFunction.get(item.schedule.functionName) ?? [];
    list.push(area);
    schedulesByFunction.set(item.schedule.functionName, list);
  }

  const records: RuntimeEvidenceRecord[] = [];

  for (const fn of functions) {
    const areas = schedulesByFunction.get(fn.identifier) ?? [];
    if (areas.length === 0) continue;

    for (const command of fn.commands) {
      for (const effect of flattenCommandEffects(command.analysis)) {
        const target = effectBounds(effect);
        if (!target || !areas.some((area) => covers(area, target))) continue;

        records.push({
          predicate: "loaded-target-chunk",
          state: "present",
          confidence: "derived",
          scope: { operationId: operationId(effect.source) },
          sourceRefs: [effect.source],
          note: "schedule on_area_loaded covers the full block-write chunk bounds.",
        });
        records.push({
          predicate: "mutation-chunk-coverage-proven",
          state: "present",
          confidence: "derived",
          scope: { operationId: operationId(effect.source) },
          sourceRefs: [effect.source],
        });
      }
    }
  }

  return records;
}
