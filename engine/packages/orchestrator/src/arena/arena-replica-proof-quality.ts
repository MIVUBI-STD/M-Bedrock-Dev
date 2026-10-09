import type { ArenaNativeSpatialAudit } from "../arena/arena-native-extraction.js";
import type { ArenaProofCoverageReport } from "./arena-proof-coverage.js";
import type { ArenaVoxelProof } from "./arena-voxel-proof.js";
import type { ArenaBlockEntityProof } from "./arena-block-entity-proof.js";

export type ArenaReplicaProofQualityStatus =
  | "complete-proof"
  | "bounded-proof"
  | "diverged"
  | "incomplete-proof"
  | "budget-exceeded"
  | "no-proof";

export interface ArenaReplicaProofQuality {
  arenaId: string;
  status: ArenaReplicaProofQualityStatus;
  plannedBlocks: number;
  proofEligibleBlocks: number;
  comparedBlocks: number;
  unresolvedBlocks: number;
  excludedBlocks: number;
  mismatchCount: number;
  eligibleCoverageRatio: number;
  effectiveArenaCoverageRatio: number;
  blockEntity?: {
    status: ArenaBlockEntityProof["status"];
    comparedEntities: number;
    unresolvedChunks: number;
    mismatchCount: number;
  };
  nativeSpatial?: {
    status: "not-available" | "chunk-record-proof" | "voxel-proof-required";
    matchesCanonical?: boolean;
  };
}

export function deriveArenaReplicaProofQuality(
  coverage: ArenaProofCoverageReport | undefined,
  voxel: ArenaVoxelProof | undefined,
  nativeSpatial: ArenaNativeSpatialAudit | undefined,
  blockEntities?: ArenaBlockEntityProof,
): ArenaReplicaProofQuality[] {
  if (!voxel) {
    const plannedBlocks =
      coverage?.plannedBlocks ?? 0;
    const proofEligibleBlocks =
      coverage?.proofBlocks ?? 0;
    const excludedBlocks =
      coverage?.excludedBlocks ?? 0;

    return (nativeSpatial?.replicas ?? []).map(
      (native) => ({
        arenaId: native.arenaId,
        status:
          native.status === "chunk-record-proof" &&
          native.matchesCanonical === false
            ? "diverged"
            : native.status === "chunk-record-proof" &&
              native.matchesCanonical === true
              ? "bounded-proof"
              : "no-proof",
        plannedBlocks,
        proofEligibleBlocks,
        comparedBlocks: 0,
        unresolvedBlocks:
          native.status === "chunk-record-proof"
            ? 0
            : proofEligibleBlocks,
        excludedBlocks,
        mismatchCount:
          native.status === "chunk-record-proof" &&
          native.matchesCanonical === false
            ? 1
            : 0,
        eligibleCoverageRatio: 0,
        effectiveArenaCoverageRatio: 0,
        nativeSpatial: {
          status: native.status,
          ...(native.matchesCanonical === undefined
            ? {}
            : {
                matchesCanonical:
                  native.matchesCanonical,
              }),
        },
      }),
    );
  }

  const plannedBlocks = coverage?.plannedBlocks ?? voxel.requiredBlocks;
  const proofEligibleBlocks = coverage?.proofBlocks ?? voxel.requiredBlocks;
  const excludedBlocks = coverage?.excludedBlocks ?? 0;
  const blockEntityByArena = new Map(
    (blockEntities?.replicas ?? []).map((item) => [
      item.arenaId,
      item,
    ]),
  );
  const nativeByArena = new Map(
    (nativeSpatial?.replicas ?? []).map((item) => [
      item.arenaId,
      item,
    ]),
  );

  return voxel.replicas.map((replica) => {
    const eligibleCoverageRatio =
      proofEligibleBlocks === 0
        ? 0
        : replica.comparedBlocks / proofEligibleBlocks;
    const effectiveArenaCoverageRatio =
      plannedBlocks === 0
        ? 0
        : replica.comparedBlocks / plannedBlocks;
    const native = nativeByArena.get(replica.arenaId);
    const blockEntity = blockEntityByArena.get(replica.arenaId);

    let status: ArenaReplicaProofQualityStatus;
    if (
      replica.status === "diverged" ||
      blockEntity?.status === "diverged"
    ) {
      status = "diverged";
    } else if (replica.status === "budget-exceeded") {
      status = "budget-exceeded";
    } else if (
      proofEligibleBlocks === 0 ||
      replica.comparedBlocks === 0
    ) {
      status = "no-proof";
    } else if (
      replica.unresolvedBlocks > 0 ||
      replica.comparedBlocks < proofEligibleBlocks ||
      blockEntity?.status === "incomplete"
    ) {
      status = "incomplete-proof";
    } else if (
      coverage?.status === "full" &&
      replica.status === "verified" &&
      (
        blockEntity === undefined ||
        blockEntity.status === "verified"
      )
    ) {
      status = "complete-proof";
    } else {
      status = "bounded-proof";
    }

    return {
      arenaId: replica.arenaId,
      status,
      plannedBlocks,
      proofEligibleBlocks,
      comparedBlocks: replica.comparedBlocks,
      unresolvedBlocks: replica.unresolvedBlocks,
      excludedBlocks,
      mismatchCount:
        replica.mismatchCount +
        (blockEntity?.mismatchCount ?? 0),
      eligibleCoverageRatio,
      effectiveArenaCoverageRatio,
      ...(blockEntity === undefined
        ? {}
        : {
            blockEntity: {
              status: blockEntity.status,
              comparedEntities: blockEntity.comparedEntities,
              unresolvedChunks: blockEntity.unresolvedChunks,
              mismatchCount: blockEntity.mismatchCount,
            },
          }),
      ...(native === undefined
        ? {}
        : {
            nativeSpatial: {
              status: native.status,
              ...(native.matchesCanonical === undefined
                ? {}
                : {
                    matchesCanonical:
                      native.matchesCanonical,
                  }),
            },
          }),
    };
  });
}
