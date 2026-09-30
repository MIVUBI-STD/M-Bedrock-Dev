import type {
  ArenaRegionClassification,
  ArenaRegionPartitionResult,
  ArenaRegionPlan,
  ArenaRegionVolume,
} from "../../../analyzers/topology/src/index.js";

export type ArenaProofCoverageStatus =
  | "full"
  | "partial"
  | "none";

export interface ArenaProofCoverageReport {
  status: ArenaProofCoverageStatus;
  plannedBlocks: number;
  proofBlocks: number;
  excludedBlocks: number;
  coverageRatio: number;
  partitionTruncated: boolean;
  regions: {
    planned: number;
    proof: number;
  };
  roleBlocks: {
    static: number;
    mutable: number;
    mixed: number;
    ignored: number;
    unknown: number;
  };
}

function blockCount(volume: ArenaRegionVolume): number {
  return (
    (volume.max.x - volume.min.x + 1) *
    (volume.max.y - volume.min.y + 1) *
    (volume.max.z - volume.min.z + 1)
  );
}

function countVolumes(
  volumes: readonly ArenaRegionVolume[],
): number {
  return volumes.reduce(
    (sum, volume) => sum + blockCount(volume),
    0,
  );
}

export function deriveArenaProofCoverage(
  plan: ArenaRegionPlan | undefined,
  classification: ArenaRegionClassification | undefined,
  partition: ArenaRegionPartitionResult | undefined,
): ArenaProofCoverageReport | undefined {
  if (!plan) return undefined;

  const plannedBlocks = plan.totalBlocks;
  const fallbackProofVolumes =
    classification === undefined
      ? plan.volumes
      : [
          ...classification.staticVolumes,
          ...classification.mixedVolumes,
          ...classification.unknownVolumes,
        ];
  const proofVolumes =
    partition?.volumes ??
    fallbackProofVolumes;
  const proofBlocks = countVolumes(proofVolumes);
  const excludedBlocks = Math.max(
    0,
    plannedBlocks - proofBlocks,
  );
  const coverageRatio =
    plannedBlocks === 0
      ? 0
      : proofBlocks / plannedBlocks;

  return {
    status:
      proofBlocks === 0
        ? "none"
        : proofBlocks === plannedBlocks
          ? "full"
          : "partial",
    plannedBlocks,
    proofBlocks,
    excludedBlocks,
    coverageRatio,
    partitionTruncated:
      partition?.truncated ?? false,
    regions: {
      planned: plan.volumes.length,
      proof: proofVolumes.length,
    },
    roleBlocks: {
      static:
        classification === undefined
          ? 0
          : countVolumes(classification.staticVolumes),
      mutable:
        classification === undefined
          ? 0
          : countVolumes(classification.mutableVolumes),
      mixed:
        classification === undefined
          ? 0
          : countVolumes(classification.mixedVolumes),
      ignored:
        classification === undefined
          ? 0
          : countVolumes(classification.ignoredVolumes),
      unknown:
        classification === undefined
          ? plannedBlocks
          : countVolumes(classification.unknownVolumes),
    },
  };
}
