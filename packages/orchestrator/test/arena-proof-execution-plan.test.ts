import { describe, expect, it } from "vitest";
import { planArenaProofExecution } from "../src/arena-proof-execution-plan.js";

describe("arena proof execution plan", () => {
  const nativeMatch = {
    status: "chunk-record-proof" as const,
    region: {
      minChunkX: 0,
      maxChunkX: 0,
      minChunkZ: 0,
      maxChunkZ: 0,
      dimensionId: 0,
    },
    replicas: [{
      arenaId: "arena-2",
      status: "chunk-record-proof" as const,
      reason: "match",
      matchesCanonical: true,
    }],
  };

  it("skips expensive decode when complete native evidence already matches", () => {
    const plan = planArenaProofExecution({
      mode: "progressive",
      nativeSpatial: nativeMatch,
      blockEntityRecords: 10,
      pendingTickRecords: 0,
      randomTickRecords: 0,
      actorRecords: 100,
    });

    expect(plan.skippedLayers).toEqual(
      expect.arrayContaining([
        "voxel",
        "block-entity",
        "actor-population",
      ]),
    );
  });

  it("escalates voxel when translation requires coordinate proof", () => {
    const plan = planArenaProofExecution({
      nativeSpatial: {
        ...nativeMatch,
        status: "voxel-proof-required",
        replicas: [{
          arenaId: "arena-2",
          status: "voxel-proof-required",
          reason: "non aligned",
        }],
      },
      blockEntityRecords: 0,
      pendingTickRecords: 0,
      randomTickRecords: 0,
      actorRecords: 0,
    });

    expect(
      plan.executedLayers,
    ).toContain("voxel");
  });

  it("full mode executes every available proof layer", () => {
    const plan = planArenaProofExecution({
      mode: "full",
      nativeSpatial: nativeMatch,
      blockEntityRecords: 1,
      pendingTickRecords: 1,
      randomTickRecords: 0,
      actorRecords: 1,
    });

    expect(plan.executedLayers).toEqual([
      "native-spatial",
      "voxel",
      "block-entity",
      "tick-state",
      "actor-population",
    ]);
  });
});
