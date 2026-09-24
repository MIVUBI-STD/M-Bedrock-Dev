import type {
  BlockVolume,
  RouteCorridorContract,
} from "../../project-model/src/route-corridor.js";
import { blockVolumesOverlap } from "../../project-model/src/route-corridor.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import type { SourceRef } from "../../project-model/src/source-ref.js";
import type { analyzeFunctionTopology } from "./topology-analysis.js";
import type { derivePlacementProofs } from "./structure-proof-analysis.js";

type TopologyAnalysis = ReturnType<typeof analyzeFunctionTopology>;
type StructureProofs = ReturnType<typeof derivePlacementProofs>;

export type RouteMutationCorrelationStatus =
  | "overlap"
  | "no-overlap"
  | "dimension-unresolved";

export interface RouteMutationCorrelation {
  routeId: string;
  mutationId: string;
  status: RouteMutationCorrelationStatus;
  source?: SourceRef;
  mutationVolume: BlockVolume;
  entityKeys: readonly string[];
}

function normalizedVolume(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
): BlockVolume {
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

function topologyMutationVolume(
  record: TopologyAnalysis["spatialRecords"][number],
): BlockVolume | undefined {
  const resolved = record.resolved;
  if (resolved.kind === "fill") {
    return normalizedVolume(resolved.from, resolved.to);
  }
  if (resolved.kind === "setblock") {
    return normalizedVolume(resolved.position, resolved.position);
  }
  if (resolved.kind === "clone") {
    const size = {
      x: Math.abs(resolved.to.x - resolved.from.x) + 1,
      y: Math.abs(resolved.to.y - resolved.from.y) + 1,
      z: Math.abs(resolved.to.z - resolved.from.z) + 1,
    };
    return normalizedVolume(
      resolved.destination,
      {
        x: resolved.destination.x + size.x - 1,
        y: resolved.destination.y + size.y - 1,
        z: resolved.destination.z + size.z - 1,
      },
    );
  }
  return undefined;
}

function sourceMutationId(source: SourceRef): string {
  return [
    source.artifactId,
    source.relativePath,
    source.range?.lineStart ?? 0,
    source.range?.columnStart ?? 0,
  ].join(":");
}

export function correlateRouteMutations(
  routes: readonly RouteCorridorContract[],
  topology: TopologyAnalysis,
  structureProofs: StructureProofs,
  mutationDimension?: string,
): RouteMutationCorrelation[] {
  const mutations: Array<{
    id: string;
    volume: BlockVolume;
    source?: SourceRef;
  }> = [];

  for (const record of topology.spatialRecords) {
    const volume = topologyMutationVolume(record);
    if (!volume) continue;
    mutations.push({
      id: sourceMutationId(record.effect.source),
      volume,
      source: record.effect.source,
    });
  }

  for (const [key, bounds] of structureProofs.bounds) {
    mutations.push({
      id: "structure:" + key,
      volume: { min: bounds.min, max: bounds.max },
    });
  }

  const output: RouteMutationCorrelation[] = [];
  for (const route of routes) {
    for (const mutation of mutations) {
      const geometryOverlap = blockVolumesOverlap(route.volume, mutation.volume);
      let status: RouteMutationCorrelationStatus = geometryOverlap
        ? "overlap"
        : "no-overlap";

      if (
        geometryOverlap &&
        route.dimension !== undefined &&
        mutationDimension === undefined
      ) {
        status = "dimension-unresolved";
      } else if (
        geometryOverlap &&
        route.dimension !== undefined &&
        mutationDimension !== undefined &&
        route.dimension !== mutationDimension
      ) {
        status = "no-overlap";
      }

      output.push({
        routeId: route.id,
        mutationId: mutation.id,
        status,
        ...(mutation.source === undefined ? {} : { source: mutation.source }),
        mutationVolume: mutation.volume,
        entityKeys: route.entityKeys ?? [],
      });
    }
  }

  return output.sort((a, b) =>
    a.routeId.localeCompare(b.routeId) ||
    a.mutationId.localeCompare(b.mutationId)
  );
}

export function routeMutationRuntimeEvidence(
  correlations: readonly RouteMutationCorrelation[],
  navigatingEntities: ReadonlyMap<string, readonly SourceRef[]> = new Map(),
  targetDrivenEntities: ReadonlyMap<string, readonly SourceRef[]> = new Map(),
): RuntimeEvidenceRecord[] {
  return correlations.flatMap((item): RuntimeEvidenceRecord[] => {
    if (item.status !== "overlap") return [];
    const linkedNavigators = item.entityKeys.filter((key) =>
      navigatingEntities.has(key)
    );

    const records: RuntimeEvidenceRecord[] = [{
      predicate: "route-affecting-world-mutation",
      state: "present",
      confidence: "derived",
      scope: { operationId: item.mutationId },
      ...(item.source === undefined ? {} : { sourceRefs: [item.source] }),
      note: "Mutation overlaps route corridor " + item.routeId + ".",
    }, {
      predicate: "route-corridor-contract",
      state: "present",
      confidence: "observed",
      scope: { operationId: item.mutationId },
      ...(item.source === undefined ? {} : { sourceRefs: [item.source] }),
      note: item.routeId,
    }];

    if (linkedNavigators.length > 0) {
      records.push({
        predicate: "route-navigation-consumer-present",
        state: "present",
        confidence: "derived",
        scope: { operationId: item.mutationId },
        sourceRefs: [
          ...(item.source === undefined ? [] : [item.source]),
          ...linkedNavigators.flatMap(
            (key) => navigatingEntities.get(key) ?? [],
          ),
        ],
        relatedNodeIds: linkedNavigators,
        note: linkedNavigators.join(","),
      });
    }

    const linkedTargetDriven = item.entityKeys.filter((key) =>
      targetDrivenEntities.has(key)
    );
    if (linkedTargetDriven.length > 0) {
      records.push({
        predicate: "route-target-driven-consumer-present",
        state: "present",
        confidence: "derived",
        scope: { operationId: item.mutationId },
        sourceRefs: [
          ...(item.source === undefined ? [] : [item.source]),
          ...linkedTargetDriven.flatMap(
            (key) => targetDrivenEntities.get(key) ?? [],
          ),
        ],
        relatedNodeIds: linkedTargetDriven,
        note: linkedTargetDriven.join(","),
      });
    }

    return records;
  });
}
