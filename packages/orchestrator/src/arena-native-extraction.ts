import {
  createRegionalChunkFingerprint,
  translatedChunkRegion,
  type ChunkContentObservation,
  type ChunkRegion,
  type RegionalChunkFingerprint,
} from "../../../analyzers/world-db/src/index.js";
import type {
  ArenaReplicaDiscovery,
  ArenaVector3,
} from "../../../analyzers/topology/src/index.js";

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
}

function chunkOf(value: number): number {
  return Math.floor(value / 16);
}

function topologyEnvelope(
  discovery: ArenaReplicaDiscovery,
  marginChunks: number,
  dimensionId = 0,
): ChunkRegion {
  const points: ArenaVector3[] = [
    discovery.canonical.anchor,
    ...discovery.canonical.items
      .map((item) => item.position)
      .filter((item): item is ArenaVector3 => item !== undefined),
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
  discovery: ArenaReplicaDiscovery,
  observations: readonly ChunkContentObservation[],
  options: {
    marginChunks?: number;
    dimensionId?: number;
  } = {},
): ArenaNativeSpatialAudit {
  const region = topologyEnvelope(
    discovery,
    options.marginChunks ?? 2,
    options.dimensionId ?? 0,
  );

  if (observations.length === 0) {
    return {
      status: "not-available",
      region,
      replicas: discovery.replicas.map((replica) => ({
        arenaId: replica.arenaId,
        status: "not-available",
        reason: "No hashed native chunk records were available for comparison.",
      })),
    };
  }

  const canonical = createRegionalChunkFingerprint(
    observations,
    region,
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

    const translated = translatedChunkRegion(region, {
      x: offset.x,
      z: offset.z,
    });
    if (!translated) {
      return {
        arenaId: replica.arenaId,
        status: "voxel-proof-required" as const,
        reason:
          "Arena translation is not chunk-aligned; raw chunk-record hashes cannot prove voxel equivalence without decoding block coordinates.",
      };
    }

    const fingerprint = createRegionalChunkFingerprint(
      observations,
      translated,
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
  };
}
