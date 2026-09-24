import type { SemanticGraph } from "../../graph/src/graph.js";
import type {
  CausalChain,
  CausalIncident,
} from "../../project-model/src/causal-chain.js";
import type {
  DiagnosticRepairDecision,
} from "../../project-model/src/diagnostic-decision.js";
import type {
  InvariantRegistrySnapshot,
} from "../../project-model/src/invariant-registry.js";
import {
  selectRepairStrategyForIncident,
  type CausalRepairStrategyPolicy,
  type CausalRepairStrategySelection,
} from "./causal-repair-strategy-selection.js";
import type {
  RepairStrategyProviderProposal,
  RepairStrategyProviderRegistry,
} from "./repair-strategy-provider.js";
import {
  validateRepairStrategyProviderProposal,
  validateRepairStrategyProviderRegistry,
} from "./repair-strategy-provider.js";

export type ProviderBackedRepairStrategySelection =
  | {
      status: "provider-validation-blocked";
      providerErrors: readonly string[];
    }
  | {
      status: "evaluated";
      result: CausalRepairStrategySelection;
    };

export function selectProviderBackedRepairStrategyForIncident(
  graph: SemanticGraph,
  incident: CausalIncident,
  chains: readonly CausalChain[],
  diagnostic: DiagnosticRepairDecision,
  invariantRegistry: InvariantRegistrySnapshot,
  providerRegistry: RepairStrategyProviderRegistry,
  proposals: readonly RepairStrategyProviderProposal[],
  policy: CausalRepairStrategyPolicy = {},
): ProviderBackedRepairStrategySelection {
  const providerErrors = [
    ...validateRepairStrategyProviderRegistry(
      providerRegistry,
    ),
    ...proposals.flatMap((proposal) =>
      validateRepairStrategyProviderProposal(
        providerRegistry,
        proposal,
        { requireCausalAuto: true },
      ).map(
        (error) =>
          proposal.providerId + ": " + error,
      )
    ),
  ];

  if (providerErrors.length > 0) {
    return {
      status: "provider-validation-blocked",
      providerErrors: [...new Set(providerErrors)].sort(),
    };
  }

  return {
    status: "evaluated",
    result: selectRepairStrategyForIncident(
      graph,
      incident,
      chains,
      diagnostic,
      invariantRegistry,
      proposals.map((proposal) => proposal.strategy),
      policy,
    ),
  };
}
