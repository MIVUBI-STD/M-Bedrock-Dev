import type { SemanticGraph } from "../../graph/src/index.js";
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
  deriveRepairInvariants,
  type RepairInvariantDerivation,
} from "./repair-invariant-derivation.js";
import {
  selectRepairStrategy,
  type RepairStrategyCandidate,
  type RepairStrategySelection,
  type RepairStrategySelectionPolicy,
} from "./repair-strategy-selection.js";

export type CausalRepairStrategySelection =
  | {
      status: "invariant-derivation-blocked";
      derivation: RepairInvariantDerivation;
      reasons: readonly string[];
    }
  | {
      status: "evaluated";
      derivation: RepairInvariantDerivation;
      selection: RepairStrategySelection;
    };

export interface CausalRepairStrategyPolicy
  extends Omit<
    RepairStrategySelectionPolicy,
    "invariantRegistry" | "requiredInvariantIds"
  > {}

export function selectRepairStrategyForIncident(
  graph: SemanticGraph,
  incident: CausalIncident,
  chains: readonly CausalChain[],
  diagnostic: DiagnosticRepairDecision,
  invariantRegistry: InvariantRegistrySnapshot,
  candidates: readonly RepairStrategyCandidate[],
  policy: CausalRepairStrategyPolicy = {},
): CausalRepairStrategySelection {
  const derivation = deriveRepairInvariants(
    incident,
    diagnostic,
    chains,
    invariantRegistry,
  );

  if (!derivation.automaticSelectionAllowed) {
    return {
      status: "invariant-derivation-blocked",
      derivation,
      reasons: derivation.reasons.length > 0
        ? derivation.reasons
        : [
            "Automatic repair strategy selection is blocked because required invariant provenance is incomplete.",
          ],
    };
  }

  return {
    status: "evaluated",
    derivation,
    selection: selectRepairStrategy(
      graph,
      diagnostic,
      candidates,
      {
        invariantRegistry,
        requiredInvariantIds: derivation.invariantIds,
        ...(policy.allowGuarded === undefined
          ? {}
          : { allowGuarded: policy.allowGuarded }),
        ...(policy.blastRadiusPolicy === undefined
          ? {}
          : {
              blastRadiusPolicy:
                policy.blastRadiusPolicy,
            }),
        ...(policy.decisionBasis === undefined
          ? {}
          : { decisionBasis: policy.decisionBasis }),
      },
    ),
  };
}
