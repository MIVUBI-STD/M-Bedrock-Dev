import {
  createRegionalChunkFingerprint,
  createRegionalChunkFingerprintFromRegions,
  translatedChunkRegion,
  type ChunkContentObservation,
  type ChunkRegion,
  type RegionalChunkFingerprint,
} from "../../../../analyzers/world-db/src/index.js";
import type {
  ArenaRegionPlan,
  ArenaSpatialLayoutSource,
  ArenaVector3,
} from "../../../../analyzers/topology/src/index.js";

export type ArenaNativeSpatialProofStatus =
  | "not-available"
  | "chunk-record-proof"
  | "voxel-proof-required";

export interface ArenaNativeSpatialReplicaProof {
  arenaId: string;
  status: ArenaNativeSpatialProofStatus;
  reason: string;
  fingerprint?: RegionalChunkFingerprint;
  matchesCanonical?: boolean;
}

export interface ArenaNativeSpatialAudit {
  status: ArenaNativeSpatialProofStatus;
  canonical?: RegionalChunkFingerprint;
  replicas: readonly ArenaNativeSpatialReplicaProof[];
  region: ChunkRegion;
  regions?: readonly ChunkRegion[];
}

function chunkOf(value: number): number {
  return Math.floor(value / 16);
}

function topologyEnvelope(
  discovery: ArenaSpatialLayoutSource,
  marginChunks: number,
  dimensionId = 0,
): ChunkRegion {
  const points: ArenaVector3[] = [
    discovery.canonical.anchor,
    ...("items" in discovery.canonical
      ? discovery.canonical.items
          .map((item) => item.position)
          .filter((item): item is ArenaVector3 => item !== undefined)
      : []),
  ];
  const xs = points.map((item) => chunkOf(item.x));
  const zs = points.map((item) => chunkOf(item.z));

  return {
    minChunkX: Math.min(...xs) - marginChunks,
    maxChunkX: Math.max(...xs) + marginChunks,
    minChunkZ: Math.min(...zs) - marginChunks,
    maxChunkZ: Math.max(...zs) + marginChunks,
    dimensionId,
  };
}

export function auditArenaNativeSpatialContent(
  discovery: ArenaSpatialLayoutSource,
  observations: readonly ChunkContentObservation[],
  options: {
    marginChunks?: number;
    dimensionId?: number;
    regionPlan?: ArenaRegionPlan;
    includedVolumes?: readonly ArenaRegionPlan["volumes"][number][];
  } = {},
): ArenaNativeSpatialAudit {
  const region = topologyEnvelope(
    discovery,
    options.marginChunks ?? 2,
    options.dimensionId ?? 0,
  );
  const sourceVolumes =
    options.includedVolumes ??
    options.regionPlan?.volumes;
  const gameplayRegions = sourceVolumes?.map((volume) => ({
    minChunkX: chunkOf(volume.min.x),
    maxChunkX: chunkOf(volume.max.x),
    minChunkZ: chunkOf(volume.min.z),
    maxChunkZ: chunkOf(volume.max.z),
    dimensionId: options.dimensionId ?? 0,
  })) ?? [];
  const regionKey = (item: ChunkRegion) =>
    [
      item.dimensionId,
      item.minChunkX,
      item.maxChunkX,
      item.minChunkZ,
      item.maxChunkZ,
    ].join(":");
  const regions = [
    ...new Map(
      [region, ...gameplayRegions].map((item) => [
        regionKey(item),
        item,
      ]),
    ).values(),
  ];

  if (observations.length === 0) {
    return {
      status: "not-available",
      region,
      regions,
      replicas: discovery.replicas.map((replica) => ({
        arenaId: replica.arenaId,
        status: "not-available",
        reason: "No hashed native chunk records were available for comparison.",
      })),
    };
  }

  const canonical =
    regions.length === 1
      ? createRegionalChunkFingerprint(
          observations,
          regions[0]!,
          {
            chunkX: chunkOf(discovery.canonical.anchor.x),
            chunkZ: chunkOf(discovery.canonical.anchor.z),
          },
        )
      : createRegionalChunkFingerprintFromRegions(
          observations,
          regions,
          {
            chunkX: chunkOf(discovery.canonical.anchor.x),
            chunkZ: chunkOf(discovery.canonical.anchor.z),
          },
        );

  const replicas = discovery.replicas.map((replica, index) => {
    const offset = discovery.offsets[index];
    if (!offset) {
      return {
        arenaId: replica.arenaId,
        status: "not-available" as const,
        reason: "Replica translation evidence is missing.",
      };
    }

    const translatedRegions = regions.map((item) =>
      translatedChunkRegion(item, {
        x: offset.x,
        z: offset.z,
      })
    );
    if (translatedRegions.some((item) => item === undefined)) {
      return {
        arenaId: replica.arenaId,
        status: "voxel-proof-required" as const,
        reason:
          "Arena translation is not chunk-aligned; raw chunk-record hashes cannot prove voxel equivalence without decoding block coordinates.",
      };
    }

    const concreteRegions = translatedRegions.filter(
      (item): item is ChunkRegion => item !== undefined,
    );
    const fingerprint =
      concreteRegions.length === 1
        ? createRegionalChunkFingerprint(
            observations,
            concreteRegions[0]!,
            {
              chunkX: chunkOf(replica.anchor.x),
              chunkZ: chunkOf(replica.anchor.z),
            },
          )
        : createRegionalChunkFingerprintFromRegions(
            observations,
            concreteRegions,
            {
              chunkX: chunkOf(replica.anchor.x),
              chunkZ: chunkOf(replica.anchor.z),
            },
          );

    return {
      arenaId: replica.arenaId,
      status: "chunk-record-proof" as const,
      reason:
        "Arena translation is chunk-aligned, so normalized raw chunk-record content is comparable.",
      fingerprint,
      matchesCanonical: fingerprint.hash === canonical.hash,
    };
  });

  return {
    status: replicas.some((item) => item.status === "voxel-proof-required")
      ? "voxel-proof-required"
      : "chunk-record-proof",
    canonical,
    replicas,
    region,
    regions,
  };
}
