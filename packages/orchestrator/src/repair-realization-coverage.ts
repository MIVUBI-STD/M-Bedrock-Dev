import type {
  RepairStrategyEnumeration,
} from "./repair-strategy-enumeration.js";
import type {
  ProviderRepairRealization,
} from "./repair-strategy-enumeration.js";
import type {
  RepairRealizerCoverageReport,
} from "./repair-realizer-execution.js";

export type RepairRealizationCoverageDisposition =
  | "realized"
  | "blocked"
  | "missing-realizer"
  | "no-applicable-source";

export interface RepairRealizationCoverageItem {
  sourceId: string;
  sourceVersion: string;
  disposition: RepairRealizationCoverageDisposition;
  strategyId?: string;
  transactionId?: string;
  reasons: readonly string[];
}

export interface RepairRealizationCoverageReport {
  incidentId: string;
  candidateId: string;
  items: readonly RepairRealizationCoverageItem[];
  realizedCount: number;
  blockedCount: number;
  missingRealizerCount: number;
  noImplementationCoverage: boolean;
}

export function buildRepairRealizationCoverageReport(
  enumeration: RepairStrategyEnumeration,
  realizerCoverage: RepairRealizerCoverageReport,
  realizations: readonly ProviderRepairRealization[],
): RepairRealizationCoverageReport {
  if (enumeration.applicableSources.length === 0) {
    return {
      incidentId: enumeration.envelope.incidentId,
      candidateId: enumeration.envelope.candidateId,
      items: [{
        sourceId: "<none>",
        sourceVersion: "<none>",
        disposition: "no-applicable-source",
        reasons: [
          "No applicable repair strategy source was discovered for the proven causal candidate.",
        ],
      }],
      realizedCount: 0,
      blockedCount: 0,
      missingRealizerCount: 0,
      noImplementationCoverage: true,
    };
  }

  const realizationBySource = new Map(
    realizations.map((item) => [
      item.status === "realized"
        ? item.proposal.providerId
        : item.sourceId,
      item,
    ]),
  );

  const items = enumeration.applicableSources.map(
    (source): RepairRealizationCoverageItem => {
      const realizerItem = realizerCoverage.items.find(
        (item) =>
          item.sourceId === source.sourceId &&
          item.sourceVersion === source.sourceVersion,
      );

      if (
        !realizerItem ||
        realizerItem.status === "missing-realizer"
      ) {
        return {
          sourceId: source.sourceId,
          sourceVersion: source.sourceVersion,
          disposition: "missing-realizer",
          reasons:
            realizerItem?.reasons ?? [
              "Applicable source has no realizer coverage record.",
            ],
        };
      }

      const realization =
        realizationBySource.get(source.sourceId);
      if (!realization) {
        return {
          sourceId: source.sourceId,
          sourceVersion: source.sourceVersion,
          disposition: "blocked",
          reasons: [
            "Applicable source has a realizer but no realization result was produced.",
          ],
        };
      }

      if (realization.status === "blocked") {
        return {
          sourceId: source.sourceId,
          sourceVersion: source.sourceVersion,
          disposition: "blocked",
          reasons: realization.reasons,
        };
      }

      return {
        sourceId: source.sourceId,
        sourceVersion: source.sourceVersion,
        disposition: "realized",
        strategyId:
          realization.proposal.strategy.strategyId,
        transactionId:
          realization.proposal.strategy.transaction.id,
        reasons: realization.reasons,
      };
    },
  ).sort((a, b) =>
    a.sourceId.localeCompare(b.sourceId) ||
    a.sourceVersion.localeCompare(b.sourceVersion)
  );

  const realizedCount = items.filter(
    (item) => item.disposition === "realized",
  ).length;
  const blockedCount = items.filter(
    (item) => item.disposition === "blocked",
  ).length;
  const missingRealizerCount = items.filter(
    (item) =>
      item.disposition === "missing-realizer",
  ).length;

  return {
    incidentId: enumeration.envelope.incidentId,
    candidateId: enumeration.envelope.candidateId,
    items,
    realizedCount,
    blockedCount,
    missingRealizerCount,
    noImplementationCoverage:
      realizedCount === 0,
  };
}
