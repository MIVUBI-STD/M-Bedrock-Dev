import type {
  RepairStrategyProviderProposal,
  RepairStrategyProviderRegistry,
} from "./repair-strategy-provider.js";
import {
  repairStrategyProvider,
  validateRepairStrategyProviderProposal,
} from "./repair-strategy-provider.js";

export interface RepairProviderProposalAssessment {
  proposal: RepairStrategyProviderProposal;
  disposition:
    | "causal-auto-eligible"
    | "proposal-only"
    | "rejected";
  reasons: readonly string[];
}

export interface RepairProviderProposalPortfolio {
  causalAuto: readonly RepairStrategyProviderProposal[];
  proposalOnly: readonly RepairStrategyProviderProposal[];
  rejected: readonly RepairProviderProposalAssessment[];
  assessments: readonly RepairProviderProposalAssessment[];
}

export function assessRepairProviderProposals(
  registry: RepairStrategyProviderRegistry,
  proposals: readonly RepairStrategyProviderProposal[],
): RepairProviderProposalPortfolio {
  const assessments = proposals
    .map((proposal): RepairProviderProposalAssessment => {
      const provider = repairStrategyProvider(
        registry,
        proposal.providerId,
      );

      if (!provider) {
        return {
          proposal,
          disposition: "rejected",
          reasons: [
            "Unknown repair strategy provider: " +
              proposal.providerId +
              ".",
          ],
        };
      }

      const baseErrors =
        validateRepairStrategyProviderProposal(
          registry,
          proposal,
          { requireCausalAuto: false },
        );

      if (baseErrors.length > 0) {
        return {
          proposal,
          disposition: "rejected",
          reasons: baseErrors,
        };
      }

      if (provider.selectionMode === "proposal-only") {
        return {
          proposal,
          disposition: "proposal-only",
          reasons: [
            "Provider is explicitly proposal-only; this strategy may be reviewed but cannot enter unattended causal repair selection.",
          ],
        };
      }

      const autoErrors =
        validateRepairStrategyProviderProposal(
          registry,
          proposal,
          { requireCausalAuto: true },
        );

      if (autoErrors.length > 0) {
        return {
          proposal,
          disposition: "rejected",
          reasons: autoErrors,
        };
      }

      return {
        proposal,
        disposition: "causal-auto-eligible",
        reasons: [
          "Provider is deterministic and registered for causal automatic selection.",
        ],
      };
    })
    .sort((a, b) =>
      a.proposal.providerId.localeCompare(
        b.proposal.providerId,
      ) ||
      a.proposal.strategy.strategyId.localeCompare(
        b.proposal.strategy.strategyId,
      )
    );

  return {
    causalAuto: assessments
      .filter(
        (item) =>
          item.disposition ===
          "causal-auto-eligible",
      )
      .map((item) => item.proposal),
    proposalOnly: assessments
      .filter(
        (item) =>
          item.disposition === "proposal-only",
      )
      .map((item) => item.proposal),
    rejected: assessments.filter(
      (item) => item.disposition === "rejected",
    ),
    assessments,
  };
}
