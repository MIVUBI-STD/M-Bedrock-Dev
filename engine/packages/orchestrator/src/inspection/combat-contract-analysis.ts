import type {
  CombatBehaviorContract,
} from "../../../behavior-model/src/index.js";
import type {
  CombatLifecycleAnalysis,
} from "./combat-lifecycle-analysis.js";
import type {
  CombatRuntimeTelemetryAnalysis,
} from "./combat-runtime-telemetry-analysis.js";

export interface CombatBehaviorContractAnalysis {
  configured: boolean;
  contractId?: string;
  reviveContractContradictions: number;
  selfReviveContradictions: number;
  multipleReviverContradictions: number;
  staleReviveContradictions: number;
  reviveAfterDeathContradictions: number;
  invalidReviverObservations: number;
  projectileCleanupContractGap: number;
  secondaryEffectEligibilitySurfaces: number;
  reasons: readonly string[];
}

export function analyzeCombatBehaviorContract(
  lifecycle: CombatLifecycleAnalysis,
  runtime: CombatRuntimeTelemetryAnalysis,
  contract?: CombatBehaviorContract,
): CombatBehaviorContractAnalysis {
  if (!contract) {
    return {
      configured: false,
      reviveContractContradictions: 0,
      selfReviveContradictions: 0,
      multipleReviverContradictions: 0,
      staleReviveContradictions: 0,
      reviveAfterDeathContradictions: 0,
      invalidReviverObservations:
        runtime.byKind["invalid-reviver"],
      projectileCleanupContractGap: 0,
      secondaryEffectEligibilitySurfaces: 0,
      reasons: [
        "No authored combat behavior contract is configured; runtime anomalies remain evidence but are not compared with mode-specific allow/deny rules.",
      ],
    };
  }

  const selfReviveContradictions =
    contract.selfReviveAllowed
      ? 0
      : runtime.byKind["self-revive"];

  const multipleReviverContradictions =
    contract.multipleReviversAllowed
      ? 0
      : runtime.byKind["multiple-revivers"];

  const staleReviveContradictions =
    contract.reviveGenerationBound
      ? runtime.byKind["stale-revive"]
      : 0;

  const reviveAfterDeathContradictions =
    contract.reviveAfterDeathAllowed
      ? 0
      : runtime.byKind["revive-after-death"];

  const reviveContractContradictions =
    selfReviveContradictions +
    multipleReviverContradictions +
    staleReviveContradictions +
    reviveAfterDeathContradictions;

  const projectileCleanupContractGap =
    contract.projectileCleanupOnGenerationEnd &&
    lifecycle.projectileSpawns > 0 &&
    lifecycle.projectileRemovals === 0
      ? lifecycle.projectileSpawns
      : 0;

  const secondaryEffectEligibilitySurfaces =
    contract.secondaryEffectsRequireDamageEligibility
      ? lifecycle.secondaryEffects
      : 0;

  const reasons: string[] = [];

  if (reviveContractContradictions > 0) {
    reasons.push(
      String(reviveContractContradictions) +
        " observed revive anomaly event(s) contradict authored revive contract.",
    );
  }
  if (projectileCleanupContractGap > 0) {
    reasons.push(
      "Authored policy requires projectile cleanup on generation end, but static source evidence contains projectile creation without a recognized remove/kill surface.",
    );
  }
  if (secondaryEffectEligibilitySurfaces > 0) {
    reasons.push(
      String(secondaryEffectEligibilitySurfaces) +
        " secondary combat effect surface(s) require damage-eligibility gating under authored behavior contract; static presence alone does not prove violation.",
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      "No current static/runtime combat evidence contradicts the authored contract.",
    );
  }

  return {
    configured: true,
    contractId: contract.id,
    reviveContractContradictions,
    selfReviveContradictions,
    multipleReviverContradictions,
    staleReviveContradictions,
    reviveAfterDeathContradictions,
    invalidReviverObservations:
      runtime.byKind["invalid-reviver"],
    projectileCleanupContractGap,
    secondaryEffectEligibilitySurfaces,
    reasons,
  };
}
