import type { ParsedFunction } from "../../../analyzers/functions/src/types.js";
import type { Coordinate3 } from "../../../analyzers/commands/src/coordinates.js";
import { parseBlockVerificationSemantics } from "../../../analyzers/commands/src/verification-semantics.js";
import type { StructureCoordinate, StructureSize } from "../../../adapters/mcstructure/src/types.js";
import {
  placedWorldCoordinate,
  type StructureMirror,
  type StructureRotation,
} from "../../../adapters/mcstructure/src/placement-transform.js";
import type { analyzeStructureAndChunkRuntime, StructureLoadCorrelation } from "./structure-runtime-analysis.js";

type StructureRuntimeAnalysis = ReturnType<typeof analyzeStructureAndChunkRuntime>;

export interface PlacementBounds {
  min: StructureCoordinate;
  max: StructureCoordinate;
  minChunkX: number;
  maxChunkX: number;
  minChunkZ: number;
  maxChunkZ: number;
}

export interface PostPlacementVerificationProof {
  functionId: string;
  loadLine?: number;
  verificationLine?: number;
  expectedBlock: string;
  mechanism: "testforblock" | "execute-if-block";
  bounds: PlacementBounds;
}

export interface AreaLoadedCoverageProof {
  functionId: string;
  loadLine?: number;
  scheduleFunctionId: string;
  scheduleLine?: number;
  scheduleKind: "rectangle" | "circle" | "tickingarea";
  bounds: PlacementBounds;
}

function absolute(
  coordinate: Coordinate3 | undefined,
): StructureCoordinate | undefined {
  if (!coordinate) return undefined;
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

function blockToChunk(value: number): number {
  return Math.floor(value / 16);
}

export function deriveStructurePlacementBounds(
  load: {
    position?: Coordinate3;
    rotation?: string;
    mirror?: string;
  },
  size: StructureSize | undefined,
): PlacementBounds | undefined {
  const origin = absolute(load.position);
  if (!size || !origin || size.x <= 0 || size.y <= 0 || size.z <= 0) {
    return undefined;
  }

  const rotation = (load.rotation ?? "0_degrees") as StructureRotation;
  const mirror = (load.mirror ?? "none") as StructureMirror;
  const xs = [0, size.x - 1];
  const ys = [0, size.y - 1];
  const zs = [0, size.z - 1];
  const placed: StructureCoordinate[] = [];

  for (const x of xs) {
    for (const y of ys) {
      for (const z of zs) {
        placed.push(placedWorldCoordinate(
          { x, y, z },
          size,
          origin,
          { rotation, mirror },
        ));
      }
    }
  }

  const xValues = placed.map((item) => item.x);
  const yValues = placed.map((item) => item.y);
  const zValues = placed.map((item) => item.z);
  const min = {
    x: Math.min(...xValues),
    y: Math.min(...yValues),
    z: Math.min(...zValues),
  };
  const max = {
    x: Math.max(...xValues),
    y: Math.max(...yValues),
    z: Math.max(...zValues),
  };
  return {
    min,
    max,
    minChunkX: blockToChunk(min.x),
    maxChunkX: blockToChunk(max.x),
    minChunkZ: blockToChunk(min.z),
    maxChunkZ: blockToChunk(max.z),
  };
}

function placementBounds(
  correlation: StructureLoadCorrelation,
): PlacementBounds | undefined {
  if (correlation.status !== "resolved") return undefined;
  return deriveStructurePlacementBounds(
    correlation.load.semantics,
    correlation.candidates[0]?.size,
  );
}

function inside(bounds: PlacementBounds, position: StructureCoordinate): boolean {
  return (
    position.x >= bounds.min.x &&
    position.x <= bounds.max.x &&
    position.y >= bounds.min.y &&
    position.y <= bounds.max.y &&
    position.z >= bounds.min.z &&
    position.z <= bounds.max.z
  );
}

function absoluteChunkRectangle(
  from: Coordinate3,
  to: Coordinate3,
): { minX: number; maxX: number; minZ: number; maxZ: number } | undefined {
  const a = absolute(from);
  const b = absolute(to);
  if (!a || !b) return undefined;
  return {
    minX: blockToChunk(Math.min(a.x, b.x)),
    maxX: blockToChunk(Math.max(a.x, b.x)),
    minZ: blockToChunk(Math.min(a.z, b.z)),
    maxZ: blockToChunk(Math.max(a.z, b.z)),
  };
}

function absoluteChunkCircle(
  center: Coordinate3,
  radius: number,
): { minX: number; maxX: number; minZ: number; maxZ: number } | undefined {
  const c = absolute(center);
  if (!c || radius < 0) return undefined;
  const centerChunkX = blockToChunk(c.x);
  const centerChunkZ = blockToChunk(c.z);
  return {
    minX: centerChunkX - radius,
    maxX: centerChunkX + radius,
    minZ: centerChunkZ - radius,
    maxZ: centerChunkZ + radius,
  };
}

function covers(
  area: { minX: number; maxX: number; minZ: number; maxZ: number },
  bounds: PlacementBounds,
): boolean {
  return (
    area.minX <= bounds.minChunkX &&
    area.maxX >= bounds.maxChunkX &&
    area.minZ <= bounds.minChunkZ &&
    area.maxZ >= bounds.maxChunkZ
  );
}

function namedTickingAreaBounds(
  runtime: StructureRuntimeAnalysis,
  name: string,
): { minX: number; maxX: number; minZ: number; maxZ: number } | undefined {
  const matches = runtime.tickingAreas.filter((item) =>
    (item.tickingArea.action === "add-rectangle" ||
      item.tickingArea.action === "add-circle") &&
    item.tickingArea.name === name
  );
  if (matches.length !== 1) return undefined;
  const ticking = matches[0]!.tickingArea;
  if (ticking.action === "add-rectangle") {
    return absoluteChunkRectangle(ticking.from, ticking.to);
  }
  if (ticking.action === "add-circle") {
    return absoluteChunkCircle(ticking.center, ticking.radius);
  }
  return undefined;
}

export function derivePlacementProofs(
  runtime: StructureRuntimeAnalysis,
  functions: readonly ParsedFunction[],
): {
  bounds: ReadonlyMap<string, PlacementBounds>;
  postPlacementVerifications: PostPlacementVerificationProof[];
  areaLoadedCoverage: AreaLoadedCoverageProof[];
} {
  const functionsById = new Map(functions.map((fn) => [fn.identifier, fn]));
  const boundsByOperation = new Map<string, PlacementBounds>();
  const postPlacementVerifications: PostPlacementVerificationProof[] = [];
  const areaLoadedCoverage: AreaLoadedCoverageProof[] = [];

  for (const correlation of runtime.correlations) {
    const bounds = placementBounds(correlation);
    if (!bounds) continue;
    const loadLine = correlation.load.line;
    const operationKey = correlation.load.functionId + ":" + (loadLine ?? 0);
    boundsByOperation.set(operationKey, bounds);

    const fn = functionsById.get(correlation.load.functionId);
    if (fn && loadLine !== undefined) {
      const nextLoadLine = runtime.structureLoads
        .filter((item) =>
          item.functionId === correlation.load.functionId &&
          item.line !== undefined &&
          item.line > loadLine
        )
        .map((item) => item.line!)
        .sort((a, b) => a - b)[0];

      for (const command of fn.commands) {
        const line = command.source.range?.lineStart;
        if (line === undefined || line <= loadLine) continue;
        if (nextLoadLine !== undefined && line >= nextLoadLine) continue;

        const verification = parseBlockVerificationSemantics(command.raw);
        const position = absolute(verification?.position);
        if (
          !verification ||
          !verification.gatesDependentCommand ||
          !position ||
          !inside(bounds, position)
        ) continue;

        postPlacementVerifications.push({
          functionId: correlation.load.functionId,
          loadLine,
          verificationLine: line,
          expectedBlock: verification.expectedBlock,
          mechanism: verification.mechanism,
          bounds,
        });
        break;
      }
    }

    for (const scheduleRecord of runtime.areaLoadedSchedules) {
      const schedule = scheduleRecord.schedule;
      if (schedule.functionName !== correlation.load.functionId) continue;

      let area:
        | { minX: number; maxX: number; minZ: number; maxZ: number }
        | undefined;
      let scheduleKind: AreaLoadedCoverageProof["scheduleKind"] | undefined;

      if (schedule.kind === "rectangle") {
        area = absoluteChunkRectangle(schedule.from, schedule.to);
        scheduleKind = "rectangle";
      } else if (schedule.kind === "circle") {
        area = absoluteChunkCircle(schedule.center, schedule.radius);
        scheduleKind = "circle";
      } else if (schedule.kind === "tickingarea") {
        area = namedTickingAreaBounds(runtime, schedule.tickingAreaName);
        scheduleKind = "tickingarea";
      }

      if (!area || !scheduleKind || !covers(area, bounds)) continue;
      areaLoadedCoverage.push({
        functionId: correlation.load.functionId,
        ...(loadLine === undefined ? {} : { loadLine }),
        scheduleFunctionId: scheduleRecord.functionId,
        ...(scheduleRecord.line === undefined ? {} : { scheduleLine: scheduleRecord.line }),
        scheduleKind,
        bounds,
      });
      break;
    }
  }

  return {
    bounds: boundsByOperation,
    postPlacementVerifications,
    areaLoadedCoverage,
  };
}
