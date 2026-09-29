import { describe, expect, it } from "vitest";
import { assessArenaProofReuse } from "../src/arena-proof-reuse.js";

function inspection(
  overrides:
    Record<string, unknown> = {},
) {
  return {
    fingerprint: "artifact-a",
    arenaAnalysis: {
      spatialLayout: {
        basis: "topology",
        canonical: {
          arenaId: "arena-1",
          anchor: { x: 0, y: 0, z: 0 },
        },
        replicas: [{
          arenaId: "arena-2",
          anchor: { x: 100, y: 0, z: 0 },
        }],
        offsets: [{
          x: 100,
          y: 0,
          z: 0,
        }],
        confidence: "high",
      },
      regionPlan: {
        volumes: [],
        boundingBox: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 0, y: 0, z: 0 },
        },
        totalBlocks: 0,
        evidenceCandidates: 0,
        mergeGapBlocks: 0,
        confidence: "high",
      },
      entitySpawnEvidence: [],
    },
    worldDatabase: {
      nativeScan: {
        status: "scanned",
        entriesScanned: 1,
        truncated: false,
        actorRecords: 0,
        actorDigestRecords: 0,
        chunkRecords: 1,
        blockEntityRecords: 0,
        pendingTickRecords: 0,
        randomTickRecords: 0,
        finalizedStateRecords: 0,
        subChunkRecords: 1,
        dimensions: [0],
        chunksObserved: 1,
        chunkSignals: [],
        chunkSignalsTruncated: false,
        chunkContentObservations: [{
          chunkX: 0,
          chunkZ: 0,
          dimensionId: 0,
          kind: "SubChunk",
          valueHash: "same",
          subChunkIndex: 0,
        }],
        chunkContentObservationsTruncated:
          false,
      },
    },
    structureRuntime: {
      structurePlacements: [],
    },
    scriptSpatial: {
      structurePlacements: [],
    },
    ...overrides,
  } as any;
}

describe("arena proof reuse", () => {
  it("reuses physical proof after script-only artifact change when complete world DB dependencies are unchanged", () => {
    const before = inspection();
    const after = inspection({
      fingerprint: "artifact-b",
    });

    const result =
      assessArenaProofReuse(
        before,
        after,
      );

    expect(result.reusableLayers).toEqual(
      expect.arrayContaining([
        "voxel",
        "block-entity",
        "tick-state",
        "structure-instance",
        "entity-population",
        "actor-population",
      ]),
    );
  });

  it("blocks physical reuse when native observations are truncated", () => {
    const before = inspection();
    const after = inspection({
      fingerprint: "artifact-b",
      worldDatabase: {
        nativeScan: {
          ...before.worldDatabase.nativeScan,
          chunkContentObservationsTruncated:
            true,
        },
      },
    });

    const result =
      assessArenaProofReuse(
        before,
        after,
      );

    expect(result.blockedLayers).toEqual(
      expect.arrayContaining([
        "voxel",
        "block-entity",
        "tick-state",
      ]),
    );
  });

  it("invalidates authored entity proof when spawn evidence changes", () => {
    const before = inspection();
    const after = inspection({
      fingerprint: "artifact-b",
      arenaAnalysis: {
        ...before.arenaAnalysis,
        entitySpawnEvidence: [{
          kind: "entity-spawn",
          entityIdentifier:
            "minecraft:zombie",
          position: {
            x: 1,
            y: 2,
            z: 3,
          },
          sourcePath: "scripts/main.ts",
        }],
      },
    });

    const result =
      assessArenaProofReuse(
        before,
        after,
      );

    expect(
      result.assessments.find(
        (item) =>
          item.layer ===
          "entity-population",
      )?.status,
    ).toBe("stale");
  });
});
