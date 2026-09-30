import type {
  CombatPolicy,
} from "../../behavior-model/src/index.js";
import type {
  CombatLifecycleAnalysis,
} from "./combat-lifecycle-analysis.js";
import type {
  CombatRuntimeTelemetryAnalysis,
} from "./combat-runtime-telemetry-analysis.js";

export interface CombatPolicyAnalysis {
  configured: boolean;
  policyId?: string;
  revivePolicyContradictions: number;
  selfReviveContradictions: number;
  multipleReviverContradictions: number;
  staleReviveContradictions: number;
  reviveAfterDeathContradictions: number;
  invalidReviverObservations: number;
  projectileCleanupPolicyGap: number;
  secondaryEffectEligibilitySurfaces: number;
  reasons: readonly string[];
}

export function analyzeCombatPolicy(
  lifecycle: CombatLifecycleAnalysis,
  runtime: CombatRuntimeTelemetryAnalysis,
  policy?: CombatPolicy,
): CombatPolicyAnalysis {
  if (!policy) {
    return {
      configured: false,
      revivePolicyContradictions: 0,
      selfReviveContradictions: 0,
      multipleReviverContradictions: 0,
      staleReviveContradictions: 0,
      reviveAfterDeathContradictions: 0,
      invalidReviverObservations:
        runtime.byKind["invalid-reviver"],
      projectileCleanupPolicyGap: 0,
      secondaryEffectEligibilitySurfaces: 0,
      reasons: [
        "No authored combat policy is configured; runtime anomalies remain evidence but are not compared with mode-specific allow/deny rules.",
      ],
    };
  }

  const selfReviveContradictions =
    policy.selfReviveAllowed
      ? 0
      : runtime.byKind["self-revive"];

  const multipleReviverContradictions =
    policy.multipleReviversAllowed
      ? 0
      : runtime.byKind["multiple-revivers"];

  const staleReviveContradictions =
    policy.reviveGenerationBound
      ? runtime.byKind["stale-revive"]
      : 0;

  const reviveAfterDeathContradictions =
    policy.reviveAfterDeathAllowed
      ? 0
      : runtime.byKind["revive-after-death"];

  const revivePolicyContradictions =
    selfReviveContradictions +
    multipleReviverContradictions +
    staleReviveContradictions +
    reviveAfterDeathContradictions;

  const projectileCleanupPolicyGap =
    policy.projectileCleanupOnGenerationEnd &&
    lifecycle.projectileSpawns > 0 &&
    lifecycle.projectileRemovals === 0
      ? lifecycle.projectileSpawns
      : 0;

  const secondaryEffectEligibilitySurfaces =
    policy.secondaryEffectsRequireDamageEligibility
      ? lifecycle.secondaryEffects
      : 0;

  const reasons: string[] = [];

  if (revivePolicyContradictions > 0) {
    reasons.push(
      String(revivePolicyContradictions) +
        " observed revive anomaly event(s) contradict authored revive policy.",
    );
  }
  if (projectileCleanupPolicyGap > 0) {
    reasons.push(
      "Authored policy requires projectile cleanup on generation end, but static source evidence contains projectile creation without a recognized remove/kill surface.",
    );
  }
  if (secondaryEffectEligibilitySurfaces > 0) {
    reasons.push(
      String(secondaryEffectEligibilitySurfaces) +
        " secondary combat effect surface(s) require damage-eligibility gating under authored policy; static presence alone does not prove violation.",
    );
  }
  if (reasons.length === 0) {
    reasons.push(
      "No current static/runtime combat evidence contradicts the authored policy.",
    );
  }

  return {
    configured: true,
    policyId: policy.id,
    revivePolicyContradictions,
    selfReviveContradictions,
    multipleReviverContradictions,
    staleReviveContradictions,
    reviveAfterDeathContradictions,
    invalidReviverObservations:
      runtime.byKind["invalid-reviver"],
    projectileCleanupPolicyGap,
    secondaryEffectEligibilitySurfaces,
    reasons,
  };
}
