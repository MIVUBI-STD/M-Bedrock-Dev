import { describe, expect, it } from "vitest";
import { createSpatialFingerprint } from "../../../../analyzers/world-db/src/index.js";
import { runArenaAudit } from "../../src/arena/arena-audit.js";

describe("runArenaAudit", () => {
  it("combines replica, spatial, capacity, persistence, and release checks without duplicate analyzer ownership", () => {
    const canonicalFingerprint = createSpatialFingerprint([
      { x: 0, y: 0, z: 0, blockIdentifier: "minecraft:stone" },
    ]);
    const driftedFingerprint = createSpatialFingerprint([
      { x: 0, y: 0, z: 0, blockIdentifier: "minecraft:dirt" },
    ]);

    const result = runArenaAudit({
      canonicalReplica: {
        arenaId: "arena-1",
        anchor: { x: 0, y: 0, z: 0 },
        items: [
          { key: "flag", signature: "flag:v1", position: { x: 10, y: 0, z: 0 } },
        ],
      },
      replicaCandidates: [
        {
          arenaId: "arena-2",
          anchor: { x: 100, y: 0, z: 0 },
          items: [
            { key: "flag", signature: "flag:v1", position: { x: 111, y: 0, z: 0 } },
          ],
        },
      ],
      canonicalSpatialFingerprint: canonicalFingerprint,
      spatialReplicaFingerprints: [
        { arenaId: "arena-2", fingerprint: driftedFingerprint },
      ],
      requestedConcurrentArenas: 5,
      capacityResources: [
        {
          id: "command-ticking-area",
          backend: "fixed-pool",
          total: 10,
          reserved: 2,
          perArena: 3,
        },
      ],
      currentPackUuids: ["current"],
      persistedPackIdentities: [{ identity: "old" }],
      releaseIdentities: [
        { component: "world", releaseVersion: "1.0.4" },
        { component: "behavior-pack", releaseVersion: "1.0.3" },
      ],
    });

    expect(result.capacity?.safeConcurrentArenas).toBe(2);
    expect(new Set(result.findings.map((item) => item.code))).toEqual(
      new Set([
        "ARENA_REPLICA_DIVERGENCE",
        "ARENA_SPATIAL_FINGERPRINT_DIVERGENCE",
        "ARENA_CONCURRENCY_CAPACITY_SHORTFALL",
        "PACK_IDENTITY_DRIFT",
        "RELEASE_IDENTITY_INCONSISTENT",
      ]),
    );
  });
});
