import type { SemanticGraph } from "../../../graph/src/index.js";
import type {
  RepairableTopologyCandidate,
} from "../topology-analysis.js";
import {
  planLinearTopologyRepair,
} from "../../../repair/src/index.js";
import type {
  ProviderRepairRealization,
  RepairStrategyEnumeration,
} from "../repair-strategy-enumeration.js";
import {
  realizeProviderRepairStrategyFromGraph,
} from "./repair-realizer-execution.js";
import type {
  RepairStrategyProviderRegistry,
} from "../repair-strategy-provider.js";
import type {
  RepairRealizerRegistry,
} from "../repair-realizer-registry.js";

export function realizeLinearTopologyRepairStrategy(
  enumeration: RepairStrategyEnumeration,
  graph: SemanticGraph,
  registry: RepairStrategyProviderRegistry,
  realizerRegistry: RepairRealizerRegistry,
  candidate: RepairableTopologyCandidate,
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

  return realizeProviderRepairStrategyFromGraph(
    graph,
    enumeration,
    registry,
    realizerRegistry,
    {
      sourceId: "linear-topology-repair",
      sourceVersion:
        registry.providers.find(
          (provider) =>
            provider.id ===
              "linear-topology-repair",
        )?.version ?? "",
      transaction: planned.transaction,
      repairClass: "implementation-repair",
      reversible: true,
      idempotent: false,
    },
  );
}
