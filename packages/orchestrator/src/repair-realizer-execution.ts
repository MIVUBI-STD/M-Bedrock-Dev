import type { SemanticGraph } from "../../graph/src/index.js";
import type {
  RepairStrategyProviderRegistry,
} from "./repair-strategy-provider.js";
import {
  realizeProviderRepairStrategy,
  type ProviderRepairRealization,
  type ProviderRepairRealizationInput,
  type RepairStrategyEnumeration,
} from "./repair-strategy-enumeration.js";
import {
  deriveChangedSemanticNodeIds,
} from "./repair-changed-node-derivation.js";
import {
  repairRealizerForSource,
  type RepairRealizerRegistry,
} from "./repair-realizer-registry.js";

export type RepairRealizerCoverageStatus =
  | "realizer-available"
  | "missing-realizer";

export interface RepairRealizerCoverageItem {
  sourceKind: string;
  sourceId: string;
  sourceVersion: string;
  status: RepairRealizerCoverageStatus;
  realizerId?: string;
  realizerVersion?: string;
  reasons: readonly string[];
}

export interface RepairRealizerCoverageReport {
  items: readonly RepairRealizerCoverageItem[];
  coveredSources: number;
  uncoveredSources: number;
  complete: boolean;
}

export function assessRepairRealizerCoverage(
  enumeration: RepairStrategyEnumeration,
  registry: RepairRealizerRegistry,
): RepairRealizerCoverageReport {
  const items = enumeration.applicableSources
    .map((source): RepairRealizerCoverageItem => {
      const realizer = repairRealizerForSource(
        registry,
        source.sourceKind,
        source.sourceId,
      );

      if (!realizer) {
        return {
          sourceKind: source.sourceKind,
          sourceId: source.sourceId,
          sourceVersion: source.sourceVersion,
          status: "missing-realizer",
          reasons: [
            "Applicable repair strategy source has no registered deterministic realizer.",
          ],
        };
      }

      return {
        sourceKind: source.sourceKind,
        sourceId: source.sourceId,
        sourceVersion: source.sourceVersion,
        status: "realizer-available",
        realizerId: realizer.id,
        realizerVersion: realizer.version,
        reasons: [
          "Applicable repair source has a registered deterministic realizer.",
        ],
      };
    })
    .sort((a, b) =>
      a.sourceId.localeCompare(b.sourceId) ||
      a.sourceVersion.localeCompare(b.sourceVersion)
    );

  const coveredSources = items.filter(
    (item) => item.status === "realizer-available",
  ).length;
  const uncoveredSources =
    items.length - coveredSources;

  return {
    items,
    coveredSources,
    uncoveredSources,
    complete:
      items.length > 0 &&
      uncoveredSources === 0,
  };
}

export type GraphBoundProviderRepairRealizationInput =
  Omit<ProviderRepairRealizationInput, "changedNodeIds">;

export function realizeProviderRepairStrategyFromGraph(
  graph: SemanticGraph,
  enumeration: RepairStrategyEnumeration,
  providerRegistry: RepairStrategyProviderRegistry,
  input: GraphBoundProviderRepairRealizationInput,
): ProviderRepairRealization {
  const derivation = deriveChangedSemanticNodeIds(
    graph,
    input.transaction,
  );

  if (derivation.unmatchedOperationPaths.length > 0) {
    return {
      status: "blocked",
      sourceId: input.sourceId,
      reasons: [
        "Patch operation source cannot be mapped to the current semantic graph: " +
          derivation.unmatchedOperationPaths.join(", ") +
          ".",
      ],
    };
  }

  if (derivation.changedNodeIds.length === 0) {
    return {
      status: "blocked",
      sourceId: input.sourceId,
      reasons: [
        "Patch transaction maps to no changed semantic node.",
      ],
    };
  }

  return realizeProviderRepairStrategy(
    enumeration,
    providerRegistry,
    {
      ...input,
      changedNodeIds:
        derivation.changedNodeIds,
    },
  );
}
