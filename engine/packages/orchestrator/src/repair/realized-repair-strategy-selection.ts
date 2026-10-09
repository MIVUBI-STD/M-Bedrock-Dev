import type { SemanticGraph } from "../../../graph/src/index.js";
import type {
  CausalChain,
  CausalIncident,
  DiagnosticRepairDecision,
  InvariantRegistrySnapshot,
} from "../../../project-model/src/index.js";
import {
  selectRepairStrategyForIncident,
  type CausalRepairStrategyPolicy,
  type CausalRepairStrategySelection,
} from "../diagnosis/causal-repair-strategy-selection.js";
import {
  repairRealizerRegistryRevision,
  type RepairRealizerRegistry,
} from "../repair/repair-realizer-registry.js";
import {
  repairStrategySourceRegistryRevision,
  type RepairStrategySourceRegistry,
} from "../repair/repair-strategy-source-registry.js";
import type {
  RepairStrategyCandidate,
} from "../repair/repair-strategy-selection.js";

export interface RealizedRepairStrategyProposal {
  sourceKind: string;
  sourceId: string;
  sourceVersion: string;
  realizerId: string;
  realizerVersion: string;
  strategy: RepairStrategyCandidate;
}

export interface RealizedRepairStrategySelection {
  status: "evaluated";
  sourceRegistryRevision: string;
  realizerRegistryRevision: string;
  sourceProvenance: readonly {
    sourceKind: string;
    sourceId: string;
    sourceVersion: string;
  }[];
  realizerProvenance: readonly {
    realizerId: string;
    realizerVersion: string;
  }[];
  result: CausalRepairStrategySelection;
}

export function selectRealizedRepairStrategyForIncident(
  graph: SemanticGraph,
  incident: CausalIncident,
  chains: readonly CausalChain[],
  diagnostic: DiagnosticRepairDecision,
  invariantRegistry: InvariantRegistrySnapshot,
  sourceRegistry: RepairStrategySourceRegistry,
  realizerRegistry: RepairRealizerRegistry,
  proposals: readonly RealizedRepairStrategyProposal[],
  policy: CausalRepairStrategyPolicy = {},
): RealizedRepairStrategySelection {
  const sourceRegistryRevision =
    repairStrategySourceRegistryRevision(
      sourceRegistry,
    );
  const realizerRegistryRevision =
    repairRealizerRegistryRevision(
      realizerRegistry,
    );

  const sourceProvenance = [
    ...new Map(
      proposals.map((proposal) => [
        [
          proposal.sourceKind,
          proposal.sourceId,
          proposal.sourceVersion,
        ].join(":"),
        {
          sourceKind: proposal.sourceKind,
          sourceId: proposal.sourceId,
          sourceVersion: proposal.sourceVersion,
        },
      ]),
    ).values(),
  ].sort((a, b) =>
    a.sourceKind.localeCompare(b.sourceKind) ||
    a.sourceId.localeCompare(b.sourceId) ||
    a.sourceVersion.localeCompare(b.sourceVersion)
  );

  const realizerProvenance = [
    ...new Map(
      proposals.map((proposal) => [
        proposal.realizerId +
          "@" +
          proposal.realizerVersion,
        {
          realizerId: proposal.realizerId,
          realizerVersion: proposal.realizerVersion,
        },
      ]),
    ).values(),
  ].sort((a, b) =>
    a.realizerId.localeCompare(b.realizerId) ||
    a.realizerVersion.localeCompare(b.realizerVersion)
  );

  return {
    status: "evaluated",
    sourceRegistryRevision,
    realizerRegistryRevision,
    sourceProvenance,
    realizerProvenance,
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
          repairStrategySourceRegistryRevision:
            sourceRegistryRevision,
          repairRealizerRegistryRevision:
            realizerRegistryRevision,
        },
      },
    ),
  };
}
