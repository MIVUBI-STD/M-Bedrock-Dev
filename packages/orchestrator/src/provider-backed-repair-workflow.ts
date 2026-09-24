import type { SemanticGraph } from "../../graph/src/graph.js";
import type { DiagnosticFinding } from "../../diagnostics/src/types.js";
import type {
  CausalChain,
  CausalIncident,
} from "../../project-model/src/causal-chain.js";
import type {
  DecisionBasisRevision,
  DecisionLedgerSnapshot,
} from "../../project-model/src/decision-ledger.js";
import type {
  DiagnosticRepairDecision,
} from "../../project-model/src/diagnostic-decision.js";
import type {
  InvariantRegistrySnapshot,
} from "../../project-model/src/invariant-registry.js";
import {
  selectProviderBackedRepairStrategyForIncident,
  type ProviderBackedRepairStrategySelection,
} from "./provider-backed-repair-selection.js";
import type {
  CausalRepairStrategyPolicy,
} from "./causal-repair-strategy-selection.js";
import type {
  RepairStrategyProviderProposal,
  RepairStrategyProviderRegistry,
} from "./repair-strategy-provider.js";
import {
  recordProviderBackedRepairStrategySelection,
} from "./decision-ledger-recording.js";

export type SelectAndRecordProviderBackedRepairResult =
  | {
      status: "not-recorded";
      selection: ProviderBackedRepairStrategySelection;
      ledger: DecisionLedgerSnapshot;
      reasons: readonly string[];
    }
  | {
      status: "recorded";
      selection: Extract<
        ProviderBackedRepairStrategySelection,
        { status: "evaluated" }
      >;
      ledger: DecisionLedgerSnapshot;
      decisionId: string;
      transactionId?: string;
    };

export interface SelectAndRecordProviderBackedRepairInput {
  graph: SemanticGraph;
  incident: CausalIncident;
  chains: readonly CausalChain[];
  diagnostic: DiagnosticRepairDecision;
  diagnostics: readonly DiagnosticFinding[];
  invariantRegistry: InvariantRegistrySnapshot;
  providerRegistry: RepairStrategyProviderRegistry;
  proposals: readonly RepairStrategyProviderProposal[];
  ledger: DecisionLedgerSnapshot;
  decisionId: string;
  decisionBasis: DecisionBasisRevision;
  upstreamDecisionIds?: readonly string[];
  evidenceIds?: readonly string[];
  policy?: CausalRepairStrategyPolicy;
}

export function selectAndRecordProviderBackedRepairStrategy(
  input: SelectAndRecordProviderBackedRepairInput,
): SelectAndRecordProviderBackedRepairResult {
  const selection =
    selectProviderBackedRepairStrategyForIncident(
      input.graph,
      input.incident,
      input.chains,
      input.diagnostic,
      input.diagnostics,
      input.invariantRegistry,
      input.providerRegistry,
      input.proposals,
      {
        ...(input.policy ?? {}),
        decisionBasis: {
          ...(input.policy?.decisionBasis ?? {}),
          ...input.decisionBasis,
        },
      },
    );

  if (selection.status !== "evaluated") {
    return {
      status: "not-recorded",
      selection,
      ledger: input.ledger,
      reasons: selection.providerErrors,
    };
  }

  if (selection.result.status !== "evaluated") {
    return {
      status: "not-recorded",
      selection,
      ledger: input.ledger,
      reasons: selection.result.reasons,
    };
  }

  const strategySelection = selection.result.selection;
  if (strategySelection.status !== "selected") {
    return {
      status: "not-recorded",
      selection,
      ledger: input.ledger,
      reasons:
        strategySelection.status === "ambiguous"
          ? [
              "Provider-backed repair strategy selection is ambiguous; no decision ledger entry is recorded.",
            ]
          : [
              "No provider-backed repair strategy is eligible; no decision ledger entry is recorded.",
            ],
    };
  }

  const transactionId =
    strategySelection.selected.transactionId;

  const ledger =
    recordProviderBackedRepairStrategySelection(
      input.ledger,
      selection,
      transactionId,
      {
        decisionId: input.decisionId,
        basis: input.decisionBasis,
        ...(input.upstreamDecisionIds === undefined
          ? {}
          : {
              upstreamDecisionIds:
                input.upstreamDecisionIds,
            }),
        ...(input.evidenceIds === undefined
          ? {}
          : { evidenceIds: input.evidenceIds }),
      },
    );

  return {
    status: "recorded",
    selection,
    ledger,
    decisionId: input.decisionId,
    transactionId,
  };
}
