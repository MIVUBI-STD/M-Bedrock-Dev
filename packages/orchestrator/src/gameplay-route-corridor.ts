import type {
  GameplayIntentModel,
  GameplayIntentSpatialPoint,
} from "../../gameplay-intent/src/index.js";
import type {
  RouteCorridorContract,
} from "../../project-model/src/index.js";

export interface DerivedGameplayRouteCorridor {
  contract: RouteCorridorContract;
  routeNodeId: string;
  segment: {
    fromIndex: number;
    toIndex: number;
  };
  contextIndex?: number;
  contextId?: string;
}

export interface DeriveGameplayRouteCorridorOptions {
  padding?: number;
  dimension?: string;
}

function worldPoint(
  point: GameplayIntentSpatialPoint,
  offset: { x: number; y: number; z: number },
) {
  return {
    x: point.x + offset.x,
    y: point.y + offset.y,
    z: point.z + offset.z,
  };
}

function contextDescriptors(
  model: GameplayIntentModel,
  routeNodeId: string,
): Array<{
  key: string;
  offset: { x: number; y: number; z: number };
  contextIndex?: number;
  contextId?: string;
}> {
  const node = model.nodes.find((item) => item.id === routeNodeId);
  const profile = node?.spatialProfile;
  if (!profile) return [];

  if (profile.coordinateSpace === "world") {
    return [{
      key: "world",
      offset: { x: 0, y: 0, z: 0 },
    }];
  }

  if (
    profile.coordinateSpace !== "local" ||
    profile.contextSeries === undefined
  ) {
    return [];
  }

  const series = profile.contextSeries;
  const contexts = [];
  for (let index = 0; index < series.contextCount; index += 1) {
    const contextId =
      series.contextIdPrefix !== undefined &&
      series.contextIdIndexBase !== undefined
        ? series.contextIdPrefix +
          String(index + series.contextIdIndexBase)
        : undefined;

    contexts.push({
      key: contextId ?? String(index),
      offset: {
        x:
          series.offsetBase.x +
          series.offsetStride.x * index,
        y:
          series.offsetBase.y +
          series.offsetStride.y * index,
        z:
          series.offsetBase.z +
          series.offsetStride.z * index,
      },
      contextIndex: index,
      ...(contextId === undefined ? {} : { contextId }),
    });
  }
  return contexts;
}

export function deriveGameplayRouteCorridors(
  model: GameplayIntentModel,
  options: DeriveGameplayRouteCorridorOptions = {},
): DerivedGameplayRouteCorridor[] {
  const padding = options.padding ?? 1;
  if (!Number.isFinite(padding) || padding < 0) {
    throw new Error("Route corridor padding must be a non-negative finite number.");
  }

  const output: DerivedGameplayRouteCorridor[] = [];

  for (const node of model.nodes) {
    const profile = node.spatialProfile;
    if (
      node.kind !== "spatial-region" ||
      profile === undefined
    ) {
      continue;
    }

    const points = profile.points
      .filter(
        (point): point is GameplayIntentSpatialPoint & { index: number } =>
          point.index !== undefined,
      )
      .sort((a, b) => a.index - b.index);

    if (points.length < 2) continue;

    for (const context of contextDescriptors(model, node.id)) {
      for (let i = 0; i < points.length - 1; i += 1) {
        const from = points[i]!;
        const to = points[i + 1]!;

        // Do not bridge authored gaps. A missing path index is evidence
        // that continuity for this interval is unresolved.
        if (to.index !== from.index + 1) continue;

        const a = worldPoint(from, context.offset);
        const b = worldPoint(to, context.offset);
        const contractId = [
          "intent-route",
          profile.routeId,
          context.key,
          from.index + "-" + to.index,
        ].join(":");

        output.push({
          contract: {
            id: contractId,
            routeId: profile.routeId,
            ...(options.dimension === undefined
              ? {}
              : { dimension: options.dimension }),
            volume: {
              min: {
                x: Math.min(a.x, b.x) - padding,
                y: Math.min(a.y, b.y) - padding,
                z: Math.min(a.z, b.z) - padding,
              },
              max: {
                x: Math.max(a.x, b.x) + padding,
                y: Math.max(a.y, b.y) + padding,
                z: Math.max(a.z, b.z) + padding,
              },
            },
            tags: [
              "gameplay-intent-derived",
              "route:" + profile.routeId,
              "context:" + context.key,
            ],
            purpose:
              "Derived from authored gameplay route segment " +
              profile.routeId + " " +
              from.index + "→" + to.index + ".",
          },
          routeNodeId: node.id,
          segment: {
            fromIndex: from.index,
            toIndex: to.index,
          },
          ...(context.contextIndex === undefined
            ? {}
            : { contextIndex: context.contextIndex }),
          ...(context.contextId === undefined
            ? {}
            : { contextId: context.contextId }),
        });
      }
    }
  }

  return output.sort((a, b) =>
    (a.contract.routeId ?? a.contract.id).localeCompare(
      b.contract.routeId ?? b.contract.id,
    ) ||
    a.contract.id.localeCompare(b.contract.id)
  );
}
