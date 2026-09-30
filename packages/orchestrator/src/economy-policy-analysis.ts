import type {
  EconomyPolicy,
} from "../../behavior-model/src/index.js";
import type {
  RewardSourceAnalysis,
} from "./reward-source-analysis.js";

export interface EconomyPolicyAnalysis {
  configured: boolean;
  policyId?: string;
  deathRewardOverlapPolicyConflicts: number;
  deathRewardOverlapUnresolved: number;
  pickupCurrencyConsumeCoverageGaps: number;
  pickupCurrencyPolicyMismatch: number;
  idempotencyCoverageGaps: number;
  staleDropCleanupCoverageGaps: number;
  inventoryFullPolicyGaps: number;
  pickupScopeValidationUnproven: number;
  terminalRewardResultCommitUnproven: number;
  reasons: readonly string[];
}

export function analyzeEconomyPolicy(
  rewards: RewardSourceAnalysis,
  policy?: EconomyPolicy,
): EconomyPolicyAnalysis {
  if (!policy) {
    return {
      configured: false,
      deathRewardOverlapPolicyConflicts: 0,
      deathRewardOverlapUnresolved:
        rewards.deathRewardSourceOverlapCandidates,
      pickupCurrencyConsumeCoverageGaps: 0,
      pickupCurrencyPolicyMismatch: 0,
      idempotencyCoverageGaps: 0,
      staleDropCleanupCoverageGaps: 0,
      inventoryFullPolicyGaps: 0,
      pickupScopeValidationUnproven: 0,
      terminalRewardResultCommitUnproven: 0,
      reasons: [
        "No authored economy policy is configured; reward source overlaps remain unresolved rather than being classified as defects.",
      ],
    };
  }

  const deathRewardOverlapPolicyConflicts =
    policy.deathRewardArbitration ===
      "mutually-exclusive"
      ? rewards
          .deathRewardSourceOverlapCandidates
      : 0;

  const deathRewardOverlapUnresolved =
    policy.deathRewardArbitration ===
      "unresolved"
      ? rewards
          .deathRewardSourceOverlapCandidates
      : 0;

  const pickupCurrencyConsumeCoverageGaps =
    policy.pickupCurrencyItemPolicy ===
      "consume"
      ? rewards
          .pickupCurrencyWithoutConsumeCandidates
      : 0;

  const pickupCurrencyPolicyMismatch =
    policy.pickupCurrencyItemPolicy ===
        "not-applicable" &&
      rewards.pickupCurrencyPaths > 0
      ? rewards.pickupCurrencyPaths
      : 0;

  const idempotencyCoverageGaps =
    policy.rewardIdempotencyRequired
      ? rewards.rewardPathsWithoutIdempotency
      : 0;

  const staleDropCleanupCoverageGaps =
    policy.staleDropCleanupRequired &&
    rewards.worldDrops > 0 &&
    rewards.dropCleanupSurfaces === 0
      ? rewards.worldDrops
      : 0;

  const inventoryFullPolicyGaps =
    rewards.scriptInventoryGrants > 0 &&
    policy.inventoryFullPolicy ===
      "not-applicable"
      ? 1
      : 0;

  const pickupScopeValidationUnproven =
    policy.pickupScopeValidationRequired
      ? rewards.pickupCurrencyPaths
      : 0;

  const terminalRewardResultCommitUnproven =
    policy.terminalRewardRequiresResultCommit
      ? rewards.deathRewardPaths
      : 0;

  const reasons: string[] = [];

  if (
    deathRewardOverlapPolicyConflicts > 0
  ) {
    reasons.push(
      "Engine death loot and scripted death reward paths overlap while authored policy marks equivalent death rewards mutually exclusive; source-to-entitlement correlation is still required before defect promotion.",
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
      "Pickup-to-currency path lacks recognized consume/reconciliation evidence while authored policy requires consuming the pickup item; this remains a coverage gap until runtime/source correlation proves the same item entitlement.",
    );
  }
  if (
    pickupCurrencyPolicyMismatch > 0
  ) {
    reasons.push(
      "Pickup-to-currency behavior exists while authored policy marks pickup currency conversion as not applicable.",
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
  if (inventoryFullPolicyGaps > 0) {
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
      "Current reward source evidence does not contradict authored economy policy.",
    );
  }

  return {
    configured: true,
    policyId: policy.id,
    deathRewardOverlapPolicyConflicts,
    deathRewardOverlapUnresolved,
    pickupCurrencyConsumeCoverageGaps,
    pickupCurrencyPolicyMismatch,
    idempotencyCoverageGaps,
    staleDropCleanupCoverageGaps,
    inventoryFullPolicyGaps,
    pickupScopeValidationUnproven,
    terminalRewardResultCommitUnproven,
    reasons,
  };
}
