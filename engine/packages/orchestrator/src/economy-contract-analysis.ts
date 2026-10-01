import type {
  EconomyBehaviorContract,
} from "../../behavior-model/src/index.js";
import type {
  RewardSourceAnalysis,
} from "./reward-source-analysis.js";

export interface EconomyBehaviorContractAnalysis {
  configured: boolean;
  contractId?: string;
  deathRewardOverlapContractConflicts: number;
  deathRewardOverlapUnresolved: number;
  pickupCurrencyConsumeCoverageGaps: number;
  pickupCurrencyContractMismatch: number;
  idempotencyCoverageGaps: number;
  staleDropCleanupCoverageGaps: number;
  inventoryFullContractGaps: number;
  pickupScopeValidationUnproven: number;
  terminalRewardResultCommitUnproven: number;
  reasons: readonly string[];
}

export function analyzeEconomyBehaviorContract(
  rewards: RewardSourceAnalysis,
  contract?: EconomyBehaviorContract,
): EconomyBehaviorContractAnalysis {
  if (!contract) {
    return {
      configured: false,
      deathRewardOverlapContractConflicts: 0,
      deathRewardOverlapUnresolved:
        rewards.deathRewardSourceOverlapCandidates +
        rewards.deathRewardSourceOverlapUnresolved,
      pickupCurrencyConsumeCoverageGaps: 0,
      pickupCurrencyContractMismatch: 0,
      idempotencyCoverageGaps: 0,
      staleDropCleanupCoverageGaps: 0,
      inventoryFullContractGaps: 0,
      pickupScopeValidationUnproven: 0,
      terminalRewardResultCommitUnproven: 0,
      reasons: [
        "No authored economy behavior contract is configured; reward source overlaps remain unresolved rather than being classified as defects.",
      ],
    };
  }

  const deathRewardOverlapContractConflicts =
    contract.deathRewardArbitration ===
      "mutually-exclusive"
      ? rewards
          .deathRewardSourceOverlapCandidates
      : 0;

  const deathRewardOverlapUnresolved =
    contract.deathRewardArbitration ===
      "unresolved"
      ? rewards.deathRewardSourceOverlapCandidates +
        rewards.deathRewardSourceOverlapUnresolved
      : contract.deathRewardArbitration ===
          "mutually-exclusive"
        ? rewards.deathRewardSourceOverlapUnresolved
        : 0;

  const pickupCurrencyConsumeCoverageGaps =
    contract.pickupCurrencyItemPolicy ===
      "consume"
      ? rewards
          .pickupCurrencyWithoutConsumeCandidates
      : 0;

  const pickupCurrencyContractMismatch =
    contract.pickupCurrencyItemPolicy ===
        "not-applicable" &&
      rewards.pickupCurrencyPaths > 0
      ? rewards.pickupCurrencyPaths
      : 0;

  const idempotencyCoverageGaps =
    contract.rewardIdempotencyRequired
      ? rewards.rewardPathsWithoutIdempotency
      : 0;

  const staleDropCleanupCoverageGaps =
    contract.staleDropCleanupRequired
      ? rewards
          .worldDropRewardPathsWithoutCleanup
      : 0;

  const inventoryFullContractGaps =
    rewards.scriptInventoryGrants > 0 &&
    contract.inventoryFullPolicy ===
      "not-applicable"
      ? 1
      : 0;

  const pickupScopeValidationUnproven =
    contract.pickupScopeValidationRequired
      ? rewards.pickupCurrencyPaths
      : 0;

  const terminalRewardResultCommitUnproven =
    contract.terminalRewardRequiresResultCommit
      ? rewards.deathRewardPaths
      : 0;

  const reasons: string[] = [];

  if (
    deathRewardOverlapContractConflicts > 0
  ) {
    reasons.push(
      "Engine death loot and scripted death reward paths overlap while authored behavior contract marks equivalent death rewards mutually exclusive; source-to-entitlement correlation is still required before defect promotion.",
    );
  }
  if (deathRewardOverlapUnresolved > 0) {
    reasons.push(
      "Engine/script death reward overlap exists but authored arbitration is unresolved.",
    );
  }
  if (
    pickupCurrencyConsumeCoverageGaps > 0
  ) {
    reasons.push(
      "Pickup-to-currency path lacks recognized consume/reconciliation evidence while authored behavior contract requires consuming the pickup item; this remains a coverage gap until runtime/source correlation proves the same item entitlement.",
    );
  }
  if (
    pickupCurrencyContractMismatch > 0
  ) {
    reasons.push(
      "Pickup-to-currency behavior exists while authored behavior contract marks pickup currency conversion as not applicable.",
    );
  }
  if (idempotencyCoverageGaps > 0) {
    reasons.push(
      String(idempotencyCoverageGaps) +
        " reward path(s) have no reachable persistence idempotency guard evidence.",
    );
  }
  if (
    staleDropCleanupCoverageGaps > 0
  ) {
    reasons.push(
      "World-drop reward paths exist without an explicit recognized drop cleanup surface while stale-drop cleanup is required.",
    );
  }
  if (inventoryFullContractGaps > 0) {
    reasons.push(
      "Direct inventory reward grants exist while inventory-full behavior is marked not applicable.",
    );
  }
  if (pickupScopeValidationUnproven > 0) {
    reasons.push(
      String(
        pickupScopeValidationUnproven,
      ) +
        " pickup currency path(s) still require explicit scope-validation proof; this is unproven, not a confirmed contradiction.",
    );
  }
  if (
    terminalRewardResultCommitUnproven > 0
  ) {
    reasons.push(
      String(
        terminalRewardResultCommitUnproven,
      ) +
        " death reward path(s) still require RESULT_COMMITTED binding proof; this is unproven, not a confirmed contradiction.",
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      "Current reward source evidence does not contradict authored economy contract.",
    );
  }

  return {
    configured: true,
    contractId: contract.id,
    deathRewardOverlapContractConflicts,
    deathRewardOverlapUnresolved,
    pickupCurrencyConsumeCoverageGaps,
    pickupCurrencyContractMismatch,
    idempotencyCoverageGaps,
    staleDropCleanupCoverageGaps,
    inventoryFullContractGaps,
    pickupScopeValidationUnproven,
    terminalRewardResultCommitUnproven,
    reasons,
  };
}
