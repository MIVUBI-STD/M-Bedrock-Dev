import {
  createRegionalChunkFingerprintFromRegions,
  translatedChunkRegion,
  type ChunkContentObservation,
  type ChunkRegion,
  type RegionalChunkFingerprint,
} from "../../../../analyzers/world-db/src/index.js";
import type {
  ArenaRegionPlan,
  ArenaSpatialLayoutSource,
} from "../../../../analyzers/topology/src/index.js";

export type ArenaTickStateProofStatus =
  | "verified"
  | "diverged"
  | "incomplete"
  | "not-available";

export interface ArenaTickStateReplicaProof {
  arenaId: string;
  status: ArenaTickStateProofStatus;
  pendingTickRecords: number;
  randomTickRecords: number;
  matchesCanonical?: boolean;
  fingerprint?: RegionalChunkFingerprint;
  reason: string;
}

export interface ArenaTickStateProof {
  status: ArenaTickStateProofStatus;
  observationTruncated: boolean;
  canonical?: RegionalChunkFingerprint;
  canonicalPendingTickRecords: number;
  canonicalRandomTickRecords: number;
  replicas: readonly ArenaTickStateReplicaProof[];
}

function chunkOf(value: number): number {
  return Math.floor(value / 16);
}

function regionsFromPlan(
  plan: ArenaRegionPlan,
  dimensionId: number,
): ChunkRegion[] {
  return plan.volumes.map((volume) => ({
    minChunkX: chunkOf(volume.min.x),
    maxChunkX: chunkOf(volume.max.x),
    minChunkZ: chunkOf(volume.min.z),
    maxChunkZ: chunkOf(volume.max.z),
    dimensionId,
  }));
}

function inRegions(
  item: ChunkContentObservation,
  regions: readonly ChunkRegion[],
): boolean {
  return regions.some((region) =>
    item.chunkX >= region.minChunkX &&
    item.chunkX <= region.maxChunkX &&
    item.chunkZ >= region.minChunkZ &&
    item.chunkZ <= region.maxChunkZ &&
    (
      region.dimensionId === undefined ||
      item.dimensionId === region.dimensionId
    )
  );
}

function counts(
  observations: readonly ChunkContentObservation[],
  regions: readonly ChunkRegion[],
) {
  const selected = observations.filter((item) =>
    inRegions(item, regions)
  );
  return {
    pending: selected.filter(
      (item) => item.kind === "PendingTicks",
    ).length,
    random: selected.filter(
      (item) => item.kind === "RandomTicks",
    ).length,
  };
}

export function proveArenaTickStateEquivalence(
  layout: ArenaSpatialLayoutSource,
  regionPlan: ArenaRegionPlan | undefined,
  observations: readonly ChunkContentObservation[],
  options: {
    dimensionId?: number;
    observationsTruncated?: boolean;
  } = {},
): ArenaTickStateProof {
  const observationTruncated =
    options.observationsTruncated ?? false;
  if (!regionPlan) {
    return {
      status: "not-available",
      observationTruncated,
      canonicalPendingTickRecords: 0,
      canonicalRandomTickRecords: 0,
      replicas: layout.replicas.map((replica) => ({
        arenaId: replica.arenaId,
        status: "not-available",
        pendingTickRecords: 0,
        randomTickRecords: 0,
        reason:
          "Arena region plan is unavailable, so queued tick records cannot be scoped safely.",
      })),
    };
  }

  const dimensionId = options.dimensionId ?? 0;
  const tickObservations = observations.filter(
    (item) =>
      item.kind === "PendingTicks" ||
      item.kind === "RandomTicks",
  );
  const canonicalRegions =
    regionsFromPlan(regionPlan, dimensionId);
  const canonicalCounts =
    counts(tickObservations, canonicalRegions);
  const canonical =
    createRegionalChunkFingerprintFromRegions(
      tickObservations,
      canonicalRegions,
      {
        chunkX: chunkOf(layout.canonical.anchor.x),
        chunkZ: chunkOf(layout.canonical.anchor.z),
      },
    );

  const replicas: ArenaTickStateReplicaProof[] =
    layout.replicas.map((replica, index) => {
      const offset = layout.offsets[index];
      if (!offset) {
        return {
          arenaId: replica.arenaId,
          status: "incomplete" as const,
          pendingTickRecords: 0,
          randomTickRecords: 0,
          reason:
            "Replica translation evidence is missing.",
        };
      }

      const translated = canonicalRegions.map((region) =>
        translatedChunkRegion(region, {
          x: offset.x,
          z: offset.z,
        })
      );
      if (translated.some((item) => item === undefined)) {
        return {
          arenaId: replica.arenaId,
          status: "incomplete" as const,
          pendingTickRecords: 0,
          randomTickRecords: 0,
          reason:
            "Arena translation is not chunk-aligned; raw queued-tick chunk records cannot prove coordinate-equivalent state safely.",
        };
      }

      const concrete = translated.filter(
        (item): item is ChunkRegion =>
          item !== undefined,
      );
      const replicaCounts =
        counts(tickObservations, concrete);
      const fingerprint =
        createRegionalChunkFingerprintFromRegions(
          tickObservations,
          concrete,
          {
            chunkX: chunkOf(replica.anchor.x),
            chunkZ: chunkOf(replica.anchor.z),
          },
        );
      const matches =
        fingerprint.hash === canonical.hash;

      return {
        arenaId: replica.arenaId,
        status:
          !matches
            ? "diverged" as const
            : observationTruncated
              ? "incomplete" as const
              : "verified" as const,
        pendingTickRecords: replicaCounts.pending,
        randomTickRecords: replicaCounts.random,
        matchesCanonical: matches,
        fingerprint,
        reason:
          !matches
            ? "Normalized PendingTicks/RandomTicks chunk-record content differs from the canonical arena."
            : observationTruncated
              ? "Queued-tick records matched within available evidence, but the native observation set was truncated."
              : "Normalized PendingTicks/RandomTicks chunk-record content matches the canonical arena.",
      };
    });

  return {
    status:
      replicas.some((item) => item.status === "diverged")
        ? "diverged"
        : observationTruncated ||
            replicas.some(
              (item) => item.status === "incomplete",
            )
          ? "incomplete"
          : "verified",
    observationTruncated,
    canonical,
    canonicalPendingTickRecords:
      canonicalCounts.pending,
    canonicalRandomTickRecords:
      canonicalCounts.random,
    replicas,
  };
}
