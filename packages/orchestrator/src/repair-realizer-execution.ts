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
  | "missing-realizer"
  | "realizer-not-required";

export interface RepairRealizerCoverageItem {
  sourceKind: string;
  sourceId: string;
  sourceVersion: string;
  selectionMode: "causal-auto" | "proposal-only";
  deterministic: boolean;
  status: RepairRealizerCoverageStatus;
  realizerId?: string;
  realizerVersion?: string;
  reasons: readonly string[];
}

export interface RepairRealizerCoverageReport {
  items: readonly RepairRealizerCoverageItem[];
  coveredSources: number;
  uncoveredSources: number;
  realizerNotRequiredSources: number;
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
        const realizerRequired =
          source.deterministic ||
          source.automaticRealizationEligible ||
          source.selectionMode === "causal-auto";

        return {
          sourceKind: source.sourceKind,
          sourceId: source.sourceId,
          sourceVersion: source.sourceVersion,
          selectionMode: source.selectionMode,
          deterministic: source.deterministic,
          status: realizerRequired
            ? "missing-realizer"
            : "realizer-not-required",
          reasons: [
            realizerRequired
              ? "Applicable deterministic repair strategy source has no registered realizer."
              : "Applicable source is intentionally proposal-only and nondeterministic; no automatic deterministic realizer is required.",
          ],
        };
      }

      return {
        sourceKind: source.sourceKind,
        sourceId: source.sourceId,
        sourceVersion: source.sourceVersion,
        selectionMode: source.selectionMode,
        deterministic: source.deterministic,
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
  const uncoveredSources = items.filter(
    (item) => item.status === "missing-realizer",
  ).length;
  const realizerNotRequiredSources =
    items.filter(
      (item) =>
        item.status ===
        "realizer-not-required",
    ).length;

  return {
    items,
    coveredSources,
    uncoveredSources,
    realizerNotRequiredSources,
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
  realizerRegistry: RepairRealizerRegistry,
  input: GraphBoundProviderRepairRealizationInput,
): ProviderRepairRealization {
  const source = enumeration.applicableSources.find(
    (item) =>
      item.sourceId === input.sourceId &&
      item.sourceVersion === input.sourceVersion,
  );
  if (!source) {
    return {
      status: "blocked",
      sourceId: input.sourceId,
      reasons: [
        "Repair strategy source was not enumerated as applicable to this opportunity.",
      ],
    };
  }

  const realizer = repairRealizerForSource(
    realizerRegistry,
    source.sourceKind,
    source.sourceId,
  );
  if (!realizer) {
    return {
      status: "blocked",
      sourceId: input.sourceId,
      reasons: [
        "Applicable repair strategy source has no registered deterministic realizer.",
      ],
    };
  }

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

  const realized = realizeProviderRepairStrategy(
    enumeration,
    providerRegistry,
    {
      ...input,
      changedNodeIds:
        derivation.changedNodeIds,
    },
  );

  if (realized.status !== "realized") {
    return realized;
  }

  return {
    ...realized,
    proposal: {
      ...realized.proposal,
      realizerProvenance: {
        realizerId: realizer.id,
        realizerVersion: realizer.version,
        sourceKind: realizer.sourceKind,
        sourceId: realizer.sourceId,
      },
    },
  };
}
