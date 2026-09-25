import type { SemanticGraph } from "../../graph/src/index.js";
import type { DiagnosticFinding } from "../../diagnostics/src/index.js";
import type {
  CausalChain,
  CausalIncident,
} from "../../project-model/src/index.js";
import type {
  DiagnosticRepairDecision,
} from "../../project-model/src/index.js";
import type {
  InvariantRegistrySnapshot,
} from "../../project-model/src/index.js";
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
  repairStrategyProvider,
  repairStrategyProviderRegistryRevision,
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
      providerRegistryRevision: string;
      providerProvenance: readonly {
        providerId: string;
        providerVersion: string;
      }[];
    };

export function selectProviderBackedRepairStrategyForIncident(
  graph: SemanticGraph,
  incident: CausalIncident,
  chains: readonly CausalChain[],
  diagnostic: DiagnosticRepairDecision,
  diagnostics: readonly DiagnosticFinding[],
  invariantRegistry: InvariantRegistrySnapshot,
  providerRegistry: RepairStrategyProviderRegistry,
  proposals: readonly RepairStrategyProviderProposal[],
  policy: CausalRepairStrategyPolicy = {},
): ProviderBackedRepairStrategySelection {
  const selectedCandidate =
    incident.rootCauseCandidates.find(
      (candidate) =>
        candidate.id === diagnostic.selectedCandidateId,
    );
  const diagnosticById = new Map(
    diagnostics.map((finding) => [
      finding.id,
      finding,
    ]),
  );
  const selectedDiagnosticIds = new Set(
    selectedCandidate?.relatedDiagnosticIds ?? [],
  );

  const providerErrors = [
    ...validateRepairStrategyProviderRegistry(
      providerRegistry,
    ),
    ...proposals.flatMap((proposal) => {
      const provider = repairStrategyProvider(
        providerRegistry,
        proposal.providerId,
      );
      const errors = validateRepairStrategyProviderProposal(
        providerRegistry,
        proposal,
        { requireCausalAuto: true },
      );

      for (const diagnosticId of proposal.relatedDiagnosticIds) {
        const finding = diagnosticById.get(diagnosticId);
        if (!finding) {
          errors.push(
            "Proposal references unknown diagnostic id: " +
              diagnosticId +
              ".",
          );
          continue;
        }

        if (
          provider &&
          !provider.supportedDiagnosticCodes.includes(
            finding.code,
          )
        ) {
          errors.push(
            "Diagnostic " +
              diagnosticId +
              " code " +
              finding.code +
              " is outside provider supportedDiagnosticCodes.",
          );
        }

        if (!selectedDiagnosticIds.has(diagnosticId)) {
          errors.push(
            "Diagnostic " +
              diagnosticId +
              " is not part of the selected root-cause candidate provenance.",
          );
        }
      }

      return errors.map(
        (error) =>
          proposal.providerId + ": " + error,
      );
    }),
  ];

  if (providerErrors.length > 0) {
    return {
      status: "provider-validation-blocked",
      providerErrors: [...new Set(providerErrors)].sort(),
    };
  }

  const providerRegistryRevision =
    repairStrategyProviderRegistryRevision(providerRegistry);

  const providerProvenance = [...new Map(
    proposals.map((proposal) => [
      proposal.providerId + "@" + proposal.providerVersion,
      {
        providerId: proposal.providerId,
        providerVersion: proposal.providerVersion,
      },
    ]),
  ).values()].sort((a, b) =>
    a.providerId.localeCompare(b.providerId) ||
    a.providerVersion.localeCompare(b.providerVersion)
  );

  return {
    status: "evaluated",
    providerRegistryRevision,
    providerProvenance,
    result: selectRepairStrategyForIncident(
      graph,
      incident,
      chains,
      diagnostic,
      invariantRegistry,
      proposals.map((proposal) => proposal.strategy),
      {
        ...policy,
        decisionBasis: {
          ...(policy.decisionBasis ?? {}),
          repairProviderRegistryRevision:
            providerRegistryRevision,
        },
      },
    ),
  };
}
