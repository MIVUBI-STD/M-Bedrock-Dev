import type {
  ArenaVector3,
  ResolvedEffect,
} from "../../../../analyzers/topology/src/index.js";
import type {
  SourceRef,
} from "../../../project-model/src/index.js";
import type {
  analyzeFunctionTopology,
} from "../inspection/topology-analysis.js";
import type {
  ScriptSpatialAnalysis,
} from "../inspection/script-spatial-analysis.js";
import type {
  ParsedScriptFile,
} from "../../../../analyzers/scripts/src/index.js";

export type ArenaAuthoredSpatialSourceKind =
  | "fill"
  | "setblock"
  | "clone"
  | "entity-spawn"
  | "structure-load"
  | "structure-place";

export interface ArenaAuthoredSpatialSource {
  id: string;
  kind: ArenaAuthoredSpatialSourceKind;
  source: SourceRef;
  sourceKind: "command" | "script";
  executionRegion?: string;
  identifier?: string;
  volume?: {
    min: ArenaVector3;
    max: ArenaVector3;
  };
  position?: ArenaVector3;
}

function normalizedVolume(
  a: ArenaVector3,
  b: ArenaVector3,
) {
  return {
    min: {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      z: Math.min(a.z, b.z),
    },
    max: {
      x: Math.max(a.x, b.x),
      y: Math.max(a.y, b.y),
      z: Math.max(a.z, b.z),
    },
  };
}

function effectVolume(
  effect: ResolvedEffect,
):
  | {
      min: ArenaVector3;
      max: ArenaVector3;
    }
  | undefined {
  if (effect.kind === "fill") {
    return normalizedVolume(
      effect.from,
      effect.to,
    );
  }
  if (effect.kind === "setblock") {
    return {
      min: effect.position,
      max: effect.position,
    };
  }
  if (effect.kind === "clone") {
    const size = {
      x: Math.abs(
        effect.to.x - effect.from.x,
      ),
      y: Math.abs(
        effect.to.y - effect.from.y,
      ),
      z: Math.abs(
        effect.to.z - effect.from.z,
      ),
    };
    return {
      min: effect.destination,
      max: {
        x: effect.destination.x + size.x,
        y: effect.destination.y + size.y,
        z: effect.destination.z + size.z,
      },
    };
  }
  if (effect.kind === "entity-spawn") {
    return {
      min: effect.position,
      max: effect.position,
    };
  }
  return undefined;
}

function sourceId(
  kind: ArenaAuthoredSpatialSourceKind,
  source: SourceRef,
  suffix: string,
): string {
  return [
    "arena-source",
    kind,
    source.relativePath,
    source.range?.lineStart ?? 0,
    suffix,
  ].join(":");
}

export function deriveArenaAuthoredSpatialSources(
  input: {
    topology: ReturnType<
      typeof analyzeFunctionTopology
    >;
    scripts: readonly ParsedScriptFile[];
    scriptSpatial: ScriptSpatialAnalysis;
    structurePlacements: readonly {
      target: string;
      position?: ArenaVector3;
      functionId: string;
      line?: number;
    }[];
    functionSources: Readonly<
      Record<string, SourceRef>
    >;
  },
): ArenaAuthoredSpatialSource[] {
  const output: ArenaAuthoredSpatialSource[] = [];

  for (const record of input.topology.spatialRecords) {
    const effect = record.resolved;
    if (
      effect.kind === "teleport"
    ) {
      continue;
    }

    const kind =
      effect.kind as ArenaAuthoredSpatialSourceKind;
    output.push({
      id: sourceId(
        kind,
        record.effect.source,
        record.rawCommand,
      ),
      kind,
      source: record.effect.source,
      sourceKind: "command",
      ...(effectVolume(effect) === undefined
        ? {}
        : { volume: effectVolume(effect)! }),
      ...(effect.kind === "entity-spawn"
        ? {
            position: effect.position,
            identifier:
              effect.entityIdentifier,
          }
        : {}),
    });
  }

  for (
    const resolved of
      input.scriptSpatial.resolvedEffectSources
  ) {
    if (resolved.effect.kind === "teleport") {
      continue;
    }
    const kind =
      resolved.effect.kind as
        ArenaAuthoredSpatialSourceKind;
    const volume =
      effectVolume(resolved.effect);
    output.push({
      id: sourceId(
        kind,
        resolved.source,
        resolved.executionRegion,
      ),
      kind,
      source: resolved.source,
      sourceKind: "script",
      executionRegion:
        resolved.executionRegion,
      ...(volume === undefined
        ? {}
        : { volume }),
      ...(resolved.effect.kind === "entity-spawn"
        ? {
            position:
              resolved.effect.position,
            identifier:
              resolved.effect.entityIdentifier,
          }
        : {}),
    });
  }


  for (const placement of input.structurePlacements) {
    const baseSource =
      input.functionSources[
        placement.functionId
      ];
    if (!baseSource) continue;
    const source: SourceRef = {
      ...baseSource,
      ...(placement.line === undefined
        ? {}
        : {
            range: {
              lineStart: placement.line,
              lineEnd: placement.line,
            },
          }),
    };
    output.push({
      id: sourceId(
        "structure-load",
        source,
        placement.target,
      ),
      kind: "structure-load",
      source,
      sourceKind: "command",
      identifier: placement.target,
      ...(placement.position === undefined
        ? {}
        : {
            position:
              placement.position,
            volume: {
              min: placement.position,
              max: placement.position,
            },
          }),
    });
  }

  for (
    const placement of
      input.scriptSpatial.structurePlacements
  ) {
    const source = placement.source;
    output.push({
      id: sourceId(
        "structure-place",
        source,
        placement.executionRegion,
      ),
      kind: "structure-place",
      source,
      sourceKind: "script",
      executionRegion:
        placement.executionRegion,
      ...(placement.identifier === undefined
        ? {}
        : {
            identifier:
              placement.identifier,
          }),
      position: placement.position,
      volume: {
        min: placement.position,
        max: placement.position,
      },
    });
  }

  return [
    ...new Map(
      output.map((item) => [
        item.id,
        item,
      ]),
    ).values(),
  ].sort((a, b) =>
    a.source.relativePath.localeCompare(
      b.source.relativePath,
    ) ||
    (a.source.range?.lineStart ?? 0) -
      (b.source.range?.lineStart ?? 0) ||
    a.kind.localeCompare(b.kind)
  );
}
