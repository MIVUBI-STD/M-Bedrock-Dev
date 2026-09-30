import type { ArenaVector3 } from "../../../analyzers/topology/src/index.js";
import type { ArenaVoxelMismatch, ArenaVoxelProof } from "./arena-voxel-proof.js";

export interface ArenaSemanticMaskVolume {
  id: string;
  min: ArenaVector3;
  max: ArenaVector3;
  reason: "structure-overwrite" | "non-playable-depth" | "authored-mutation" | "decorative" | "custom";
}

export interface ArenaSemanticVoxelOptions {
  playableMinY?: number;
  masks?: readonly ArenaSemanticMaskVolume[];
  keepMaskedSamples?: number;
}

export interface ArenaSemanticVoxelReplicaResult {
  arenaId: string;
  rawMismatchCount: number;
  meaningfulMismatchCount: number;
  ignoredMismatchCount: number;
  meaningfulMismatches: readonly ArenaVoxelMismatch[];
  ignoredSamples: readonly {
    mismatch: ArenaVoxelMismatch;
    maskId: string;
    reason: ArenaSemanticMaskVolume["reason"];
  }[];
}

export interface ArenaSemanticVoxelAssessment {
  status: "verified" | "diverged" | "incomplete";
  rawMismatchCount: number;
  meaningfulMismatchCount: number;
  ignoredMismatchCount: number;
  replicas: readonly ArenaSemanticVoxelReplicaResult[];
}

function inside(point: ArenaVector3, volume: ArenaSemanticMaskVolume): boolean {
  return point.x >= volume.min.x && point.x <= volume.max.x &&
    point.y >= volume.min.y && point.y <= volume.max.y &&
    point.z >= volume.min.z && point.z <= volume.max.z;
}

export function assessSemanticArenaVoxelDivergence(
  proof: ArenaVoxelProof,
  options: ArenaSemanticVoxelOptions = {},
): ArenaSemanticVoxelAssessment {
  const masks: ArenaSemanticMaskVolume[] = [
    ...(options.masks ?? []),
    ...(options.playableMinY === undefined ? [] : [{
      id: "below-playable-floor",
      min: { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY, z: Number.NEGATIVE_INFINITY },
      max: { x: Number.POSITIVE_INFINITY, y: options.playableMinY - 1, z: Number.POSITIVE_INFINITY },
      reason: "non-playable-depth" as const,
    }]),
  ];
  const keepMaskedSamples = options.keepMaskedSamples ?? 24;

  const replicas = proof.replicas.map((replica) => {
    const meaningful: ArenaVoxelMismatch[] = [];
    const ignored: ArenaSemanticVoxelReplicaResult["ignoredSamples"][number][] = [];
    for (const mismatch of replica.mismatches) {
      const mask = masks.find((candidate) => inside(mismatch.canonical, candidate));
      if (!mask) {
        meaningful.push(mismatch);
        continue;
      }
      if (ignored.length < keepMaskedSamples) {
        ignored.push({ mismatch, maskId: mask.id, reason: mask.reason });
      }
    }
    return {
      arenaId: replica.arenaId,
      rawMismatchCount: replica.mismatchCount,
      meaningfulMismatchCount: meaningful.length,
      ignoredMismatchCount: Math.max(0, replica.mismatchCount - meaningful.length),
      meaningfulMismatches: meaningful,
      ignoredSamples: ignored,
    };
  });

  const rawMismatchCount = replicas.reduce((sum, item) => sum + item.rawMismatchCount, 0);
  const meaningfulMismatchCount = replicas.reduce((sum, item) => sum + item.meaningfulMismatchCount, 0);
  const ignoredMismatchCount = replicas.reduce((sum, item) => sum + item.ignoredMismatchCount, 0);

  return {
    status: meaningfulMismatchCount > 0
      ? "diverged"
      : proof.status === "incomplete" || proof.status === "budget-exceeded"
        ? "incomplete"
        : "verified",
    rawMismatchCount,
    meaningfulMismatchCount,
    ignoredMismatchCount,
    replicas,
  };
}
