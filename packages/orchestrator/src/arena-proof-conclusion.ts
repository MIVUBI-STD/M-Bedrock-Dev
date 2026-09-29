import type { ArenaProofCoverageReport } from "./arena-proof-coverage.js";
import type { ArenaVoxelProof } from "./arena-voxel-proof.js";

export type ArenaProofConclusion =
  | "complete-proof"
  | "bounded-proof"
  | "no-proof"
  | "partition-fallback";

export interface ArenaProofConclusionReport {
  conclusion: ArenaProofConclusion;
  voxelStatus?: ArenaVoxelProof["status"];
  coverageStatus?: ArenaProofCoverageReport["status"];
  coverageRatio?: number;
  statement: string;
}

export function concludeArenaProof(
  coverage: ArenaProofCoverageReport | undefined,
  voxel: ArenaVoxelProof | undefined,
): ArenaProofConclusionReport {
  if (!coverage || coverage.status === "none") {
    return {
      conclusion: "no-proof",
      ...(voxel === undefined ? {} : { voxelStatus: voxel.status }),
      ...(coverage === undefined
        ? {}
        : {
            coverageStatus: coverage.status,
            coverageRatio: coverage.coverageRatio,
          }),
      statement:
        "No arena-wide physical equivalence conclusion is supported because no proof-eligible arena volume was established.",
    };
  }

  if (coverage.partitionTruncated) {
    return {
      conclusion: "partition-fallback",
      ...(voxel === undefined ? {} : { voxelStatus: voxel.status }),
      coverageStatus: coverage.status,
      coverageRatio: coverage.coverageRatio,
      statement:
        "Arena proof used fail-closed fallback volumes because mutable-region partitioning exceeded its bounded partition budget.",
    };
  }

  if (
    coverage.status === "full" &&
    voxel?.status === "verified"
  ) {
    return {
      conclusion: "complete-proof",
      voxelStatus: voxel.status,
      coverageStatus: coverage.status,
      coverageRatio: coverage.coverageRatio,
      statement:
        "All proof-planned arena blocks were covered and decoded voxel comparison found no divergence.",
    };
  }

  return {
    conclusion: "bounded-proof",
    ...(voxel === undefined ? {} : { voxelStatus: voxel.status }),
    coverageStatus: coverage.status,
    coverageRatio: coverage.coverageRatio,
    statement:
      "Physical equivalence is supported only for the reported proof-eligible arena volume; excluded or unresolved regions are outside this conclusion.",
  };
}
