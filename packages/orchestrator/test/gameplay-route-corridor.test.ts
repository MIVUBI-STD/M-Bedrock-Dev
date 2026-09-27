import { describe, expect, it } from "vitest";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import {
  deriveGameplayRouteCorridors,
} from "../src/gameplay-route-corridor.js";

function model(): GameplayIntentModel {
  return {
    schemaVersion: 1,
    id: "route-calibration",
    evidence: [{
      id: "e:route",
      origin: "source-code",
      locator: "scripts/main.js",
      summary: "Authored local route points.",
    }],
    nodes: [{
      id: "spatial-region:route-main",
      kind: "spatial-region",
      label: "Route Main",
      status: "authored",
      evidenceIds: ["e:route"],
      spatialProfile: {
        coordinateSpace: "local",
        routeId: "main",
        points: [
          { x: 0, y: 64, z: 0, index: 0 },
          { x: 4, y: 64, z: 0, index: 1 },
          { x: 12, y: 64, z: 0, index: 3 },
        ],
        transform: {
          kind: "offset",
          offsetPath: "gameplayOffset",
          functionName: "projectPoint",
        },
        contextSeries: {
          collectionName: "arenas",
          contextCount: 2,
          offsetPath: "gameplayOffset",
          offsetBase: { x: 0, y: 0, z: 0 },
          offsetStride: { x: 100, y: 0, z: 0 },
          contextIdPrefix: "arena_",
          contextIdIndexBase: 1,
        },
      },
    }],
    edges: [],
    invariants: [],
    unknowns: [],
  };
}

describe("gameplay route corridor derivation", () => {
  it("derives one narrow corridor per contiguous segment and context", () => {
    const result = deriveGameplayRouteCorridors(
      model(),
      {
        padding: 1,
        dimension: "overworld",
      },
    );

    expect(result).toHaveLength(2);
    expect(result.map((item) => item.contract.routeId))
      .toEqual(["main", "main"]);

    expect(result[0]).toEqual(expect.objectContaining({
      routeNodeId: "spatial-region:route-main",
      contextIndex: 0,
      contextId: "arena_1",
      segment: {
        fromIndex: 0,
        toIndex: 1,
      },
      contract: expect.objectContaining({
        id: "intent-route:main:arena_1:0-1",
        routeId: "main",
        dimension: "overworld",
        volume: {
          min: { x: -1, y: 63, z: -1 },
          max: { x: 5, y: 65, z: 1 },
        },
      }),
    }));

    expect(result[1]?.contract.volume).toEqual({
      min: { x: 99, y: 63, z: -1 },
      max: { x: 105, y: 65, z: 1 },
    });

    expect(
      result.some(
        (item) => item.segment.fromIndex === 1 &&
          item.segment.toIndex === 3,
      ),
    ).toBe(false);
  });

  it("does not project unresolved local coordinate space", () => {
    const unresolved: GameplayIntentModel = {
      ...model(),
      nodes: [{
        ...model().nodes[0]!,
        spatialProfile: {
          ...model().nodes[0]!.spatialProfile!,
          coordinateSpace: "unknown",
        },
      }],
    };

    expect(
      deriveGameplayRouteCorridors(unresolved),
    ).toEqual([]);
  });
});
