import type {
  InspectArtifactResult,
} from "../inspection/inspect-artifact.js";
import {
  observeArenaGolden,
  type ArenaGoldenCase,
  type ArenaGoldenObservation,
} from "./arena-golden-corpus.js";

export interface ArenaGoldenBaselineCandidate {
  schemaVersion: 1;
  approvalRequired: true;
  case: ArenaGoldenCase;
  observation: ArenaGoldenObservation;
  warnings: readonly string[];
}

function floorRatio(
  value: number,
): number {
  return Math.floor(value * 1000) / 1000;
}

function badStatus(
  value: string | undefined,
): boolean {
  return (
    value === "diverged" ||
    value === "incomplete" ||
    value === "budget-exceeded" ||
    value === "not-available"
  );
}

export function buildArenaGoldenBaselineCandidate(
  result: InspectArtifactResult,
  input: {
    id: string;
    label: string;
    artifactFile: string;
    regionContractsFile?: string;
    note?: string;
  },
): ArenaGoldenBaselineCandidate {
  const observation =
    observeArenaGolden(result);
  const warnings: string[] = [];

  if (observation.packIdentityDrift) {
    warnings.push(
      "PACK_IDENTITY_DRIFT is present. The candidate does not encode drift as an accepted baseline condition.",
    );
  }

  if (
    observation.releaseStatus ===
    "conflict"
  ) {
    warnings.push(
      "Release identity is conflicting. Review version/manifest identity before approving this baseline.",
    );
  }

  if (
    observation.capacityOk === false
  ) {
    warnings.push(
      "Arena concurrency capacity is currently insufficient.",
    );
  }

  if (
    observation.lifecycleUnresolved > 0
  ) {
    warnings.push(
      String(
        observation.lifecycleUnresolved,
      ) +
        " lifecycle terminal candidate(s) remain unresolved.",
    );
  }

  if (
    observation.cleanupUnresolved > 0
  ) {
    warnings.push(
      String(
        observation.cleanupUnresolved,
      ) +
        " cleanup surface assessment(s) remain unresolved.",
    );
  }

  if (
    observation.sharedGlobalState > 0 ||
    observation.partitionProofRequired > 0
  ) {
    warnings.push(
      "Cross-arena state isolation still contains shared/global or unproven partitioned surfaces.",
    );
  }

  if (
    observation.globalStateUnleased > 0 ||
    observation.globalStateUnaudited > 0
  ) {
    warnings.push(
      "World-global arena state still has missing lease/audit evidence.",
    );
  }

  if (
    observation.repairLocalizationUnresolved >
    0
  ) {
    warnings.push(
      String(
        observation.repairLocalizationUnresolved,
      ) +
        " arena divergence localization(s) remain unresolved.",
    );
  }

  if (
    observation.proofConclusion ===
      "no-proof" ||
    observation.proofConclusion ===
      "partition-fallback"
  ) {
    warnings.push(
      "Arena physical proof is not strong enough to approve as a production baseline without review.",
    );
  }

  for (const [name, value] of [
    ["voxel", observation.voxelStatus],
    [
      "block-entity",
      observation.blockEntityStatus,
    ],
    [
      "entity-population",
      observation.entityPopulationStatus,
    ],
    [
      "actor-population",
      observation.actorPopulationStatus,
    ],
    [
      "tick-state",
      observation.tickStateStatus,
    ],
    [
      "structure-instance",
      observation.structureInstanceStatus,
    ],
  ] as const) {
    if (badStatus(value)) {
      warnings.push(
        name +
          " fidelity currently reports " +
          String(value) +
          ".",
      );
    }
  }

  const assertions: ArenaGoldenCase["assertions"] = {
    ...(observation.arenaCount === undefined
      ? {}
      : {
          arenaCount:
            observation.arenaCount,
        }),
    ...(observation.layoutStatus === undefined
      ? {}
      : {
          layoutStatus:
            observation.layoutStatus,
        }),
    ...(observation.proofConclusion === undefined
      ? {}
      : {
          proofConclusion:
            observation.proofConclusion,
        }),
    ...(observation.coverageRatio === undefined
      ? {}
      : {
          minCoverageRatio:
            floorRatio(
              observation.coverageRatio,
            ),
        }),
    ...(observation.capacityOk === undefined
      ? {}
      : {
          capacityOk:
            observation.capacityOk,
        }),
    ...(observation.releaseStatus ===
      "conflict"
      ? {}
      : {
          releaseStatus:
            observation.releaseStatus,
        }),
    replicaStatuses:
      observation.replicaStatuses,
    maxLifecycleUnresolved:
      observation.lifecycleUnresolved,
    maxCleanupUnresolved:
      observation.cleanupUnresolved,
    maxSharedGlobalState:
      observation.sharedGlobalState,
    maxPartitionProofRequired:
      observation.partitionProofRequired,
    maxGlobalStateUnleased:
      observation.globalStateUnleased,
    maxGlobalStateUnaudited:
      observation.globalStateUnaudited,
    maxRepairLocalizationUnresolved:
      observation.repairLocalizationUnresolved,
    ...(observation.proofMode === undefined
      ? {}
      : {
          proofMode:
            observation.proofMode,
        }),
    stressStatus:
      observation.stressStatus,
    ...(observation.nominalStressPlayers === undefined
      ? {}
      : {
          nominalStressPlayers:
            observation.nominalStressPlayers,
        }),
    ...(observation.voxelStatus === undefined
      ? {}
      : {
          voxelStatus:
            observation.voxelStatus,
        }),
    ...(observation.blockEntityStatus === undefined
      ? {}
      : {
          blockEntityStatus:
            observation.blockEntityStatus,
        }),
    ...(observation.entityPopulationStatus === undefined
      ? {}
      : {
          entityPopulationStatus:
            observation.entityPopulationStatus,
        }),
    ...(observation.actorPopulationStatus === undefined
      ? {}
      : {
          actorPopulationStatus:
            observation.actorPopulationStatus,
        }),
    ...(observation.tickStateStatus === undefined
      ? {}
      : {
          tickStateStatus:
            observation.tickStateStatus,
        }),
    ...(observation.structureInstanceStatus === undefined
      ? {}
      : {
          structureInstanceStatus:
            observation.structureInstanceStatus,
        }),
    requirePackIdentityDrift: false,
  };

  return {
    schemaVersion: 1,
    approvalRequired: true,
    case: {
      id: input.id,
      label: input.label,
      artifactFile:
        input.artifactFile,
      ...(input.regionContractsFile === undefined
        ? {}
        : {
            regionContractsFile:
              input.regionContractsFile,
          }),
      assertions,
      note:
        input.note ??
        "Generated baseline candidate. Review warnings and tighten assertions before adding to an approved production corpus.",
    },
    observation,
    warnings,
  };
}
