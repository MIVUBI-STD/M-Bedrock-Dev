import type {
  RepairableTopologyCandidate,
} from "./topology-analysis.js";
import {
  planLinearTopologyRepair,
} from "../../repair/src/index.js";
import {
  realizeProviderRepairStrategy,
  type ProviderRepairRealization,
  type RepairStrategyEnumeration,
} from "./repair-strategy-enumeration.js";
import type {
  RepairStrategyProviderRegistry,
} from "./repair-strategy-provider.js";

export function realizeLinearTopologyRepairStrategy(
  enumeration: RepairStrategyEnumeration,
  registry: RepairStrategyProviderRegistry,
  candidate: RepairableTopologyCandidate,
  changedNodeIds: readonly string[],
): ProviderRepairRealization {
  if (
    candidate.record.effect.kind !== "fill" &&
    candidate.record.effect.kind !== "setblock"
  ) {
    return {
      status: "blocked",
      sourceId: "linear-topology-repair",
      reasons: [
        "Linear topology repair supports fill/setblock effects only.",
      ],
    };
  }

  const planned = planLinearTopologyRepair(
    {
      outlier: {
        axis: candidate.outlier.axis,
        expectedCoordinate:
          candidate.outlier.expectedCoordinate,
        actualCoordinate:
          candidate.outlier.actualCoordinate,
      },
      effect: candidate.record.effect,
      rawCommand: candidate.record.rawCommand,
    },
    enumeration.envelope.sourceFingerprint,
  );

  if (planned.status !== "planned") {
    return {
      status: "blocked",
      sourceId: "linear-topology-repair",
      reasons: [planned.reason],
    };
  }

  return realizeProviderRepairStrategy(
    enumeration,
    registry,
    {
      sourceId: "linear-topology-repair",
      sourceVersion:
        registry.providers.find(
          (provider) =>
            provider.id ===
              "linear-topology-repair",
        )?.version ?? "",
      transaction: planned.transaction,
      changedNodeIds,
      repairClass: "implementation-repair",
      reversible: true,
      idempotent: false,
    },
  );
}
