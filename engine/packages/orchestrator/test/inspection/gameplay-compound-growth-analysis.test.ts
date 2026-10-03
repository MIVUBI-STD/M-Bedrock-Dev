import { describe, expect, it } from "vitest";
import {
  analyzeAccumulationGrowth,
  analyzeCompoundBoundaries,
} from "../../src/inspection/gameplay-compound-growth-analysis.js";
import type {
  GameplayWorldModel,
} from "../../src/inspection/gameplay-world-model.js";

function world(): GameplayWorldModel {
  return {
    arenas: {
      detected: true,
      count: 6,
      perArenaPlayerCapacity: 5,
      safeConcurrentArenas: 2,
    },
    chunks: {
      capacityUncheckedLeases: 1,
      tickingAreaAcquires: 3,
      tickingAreaReleases: 1,
    },
    persistence: {
      appendWithoutClear: 1,
      worldScopedAppendWithoutClear: 0,
      unknownScope: 0,
      unknownLifetime: 0,
      properties: 1,
      propertiesDetail: [{
        scriptId: "script:test",
        propertyId: "queue",
        growth: "append-without-clear",
        scope: "session",
        lifetime: "match",
      }],
    },
    economy: {
      worldDropRewardPathsWithoutCleanup: 1,
    },
  } as unknown as GameplayWorldModel;
}

describe("compound boundary and accumulation analysis", () => {
  it("finds combined arena x player and arena x simulation boundaries", () => {
    const result = analyzeCompoundBoundaries(
      world(),
    );

    expect(result.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "compound-boundary:arena-x-players",
        "compound-boundary:arena-x-ticking-capacity",
      ]),
    );
  });

  it("finds repeated-run growth risks without requiring many live runs", () => {
    const result = analyzeAccumulationGrowth(
      world(),
    );

    expect(result.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        "accumulation:persistence:script:test:queue",
        "accumulation:ticking-lease-balance",
        "accumulation:world-drop-rewards",
      ]),
    );
  });
});
