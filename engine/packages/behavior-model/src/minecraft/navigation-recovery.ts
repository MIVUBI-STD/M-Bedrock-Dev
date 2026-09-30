import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorClaimProvenance,
} from "../provenance.js";

export interface NavigationRecoveryPolicy {
  schemaVersion: 1;
  id: string;
  maxRepathAttempts: number;
  maxAnchorRecoveryAttempts: number;
  teleportFallbackEnabled: boolean;
  maxTeleportFallbackAttempts: number;
  provenance?: BehaviorClaimProvenance;
}

export interface NavigationRecoveryState {
  entityGeneration: number;
  ownerGeneration: number;
  stalledConfirmed: boolean;
  pathAnchorAvailable: boolean;
  repathAttempts: number;
  anchorRecoveryAttempts: number;
  teleportFallbackAttempts: number;
}

export type NavigationRecoveryDecision =
  | "no-action"
  | "stale-generation"
  | "repath"
  | "path-anchor-recovery"
  | "teleport-fallback"
  | "terminal-stuck";

export interface NavigationRecoveryPlan {
  decision: NavigationRecoveryDecision;
  reason: string;
  nextState: NavigationRecoveryState;
}

const provenance = projectPolicyProvenance(
  "behavior-spec:navigation-recovery-v1",
  "Bounded recovery escalation policy. Runtime effectiveness remains experiment-backed and teleport is a final fallback rather than a diagnosis.",
);

export function navigationRecoveryPolicyProvenance(): BehaviorClaimProvenance {
  return provenance;
}

function nonNegativeInteger(
  value: number,
  field: string,
): string | undefined {
  return (
    Number.isInteger(value) &&
    value >= 0
  )
    ? undefined
    : field +
        " must be a non-negative integer.";
}

export function validateNavigationRecoveryPolicy(
  policy: NavigationRecoveryPolicy,
): string[] {
  const errors: string[] = [];

  if (policy.schemaVersion !== 1) {
    errors.push(
      "Navigation recovery policy schemaVersion must be 1.",
    );
  }
  if (!policy.id.trim()) {
    errors.push(
      "Navigation recovery policy id must be non-empty.",
    );
  }

  for (const [field, value] of [
    ["maxRepathAttempts", policy.maxRepathAttempts],
    [
      "maxAnchorRecoveryAttempts",
      policy.maxAnchorRecoveryAttempts,
    ],
    [
      "maxTeleportFallbackAttempts",
      policy.maxTeleportFallbackAttempts,
    ],
  ] as const) {
    const error =
      nonNegativeInteger(value, field);
    if (error) errors.push(error);
  }

  if (
    !policy.teleportFallbackEnabled &&
    policy.maxTeleportFallbackAttempts !== 0
  ) {
    errors.push(
      "Disabled teleport fallback requires maxTeleportFallbackAttempts = 0.",
    );
  }

  return errors;
}

function increment(
  state: NavigationRecoveryState,
  field:
    | "repathAttempts"
    | "anchorRecoveryAttempts"
    | "teleportFallbackAttempts",
): NavigationRecoveryState {
  return {
    ...state,
    [field]: state[field] + 1,
  };
}

export function planNavigationRecovery(
  policy: NavigationRecoveryPolicy,
  state: NavigationRecoveryState,
): NavigationRecoveryPlan {
  const errors =
    validateNavigationRecoveryPolicy(policy);
  if (errors.length > 0) {
    throw new Error(
      "Invalid navigation recovery policy: " +
        errors.join(" "),
    );
  }

  if (
    !Number.isInteger(state.entityGeneration) ||
    !Number.isInteger(state.ownerGeneration)
  ) {
    throw new Error(
      "Navigation recovery generations must be integers.",
    );
  }

  for (const [field, value] of [
    ["repathAttempts", state.repathAttempts],
    [
      "anchorRecoveryAttempts",
      state.anchorRecoveryAttempts,
    ],
    [
      "teleportFallbackAttempts",
      state.teleportFallbackAttempts,
    ],
  ] as const) {
    const error =
      nonNegativeInteger(value, field);
    if (error) throw new Error(error);
  }

  if (
    state.entityGeneration !==
    state.ownerGeneration
  ) {
    return {
      decision: "stale-generation",
      reason:
        "Recovery owner generation does not match the current entity generation; stale recovery work must not mutate the entity.",
      nextState: state,
    };
  }

  if (!state.stalledConfirmed) {
    return {
      decision: "no-action",
      reason:
        "Recovery is forbidden until stall evidence is confirmed.",
      nextState: state,
    };
  }

  if (
    state.repathAttempts <
    policy.maxRepathAttempts
  ) {
    return {
      decision: "repath",
      reason:
        "Bounded repath attempts remain.",
      nextState: increment(
        state,
        "repathAttempts",
      ),
    };
  }

  if (
    state.pathAnchorAvailable &&
    state.anchorRecoveryAttempts <
      policy.maxAnchorRecoveryAttempts
  ) {
    return {
      decision: "path-anchor-recovery",
      reason:
        "Repath budget is exhausted and a declared path anchor is available.",
      nextState: increment(
        state,
        "anchorRecoveryAttempts",
      ),
    };
  }

  if (
    policy.teleportFallbackEnabled &&
    state.teleportFallbackAttempts <
      policy.maxTeleportFallbackAttempts
  ) {
    return {
      decision: "teleport-fallback",
      reason:
        "Earlier bounded recovery stages are exhausted; teleport fallback is now permitted.",
      nextState: increment(
        state,
        "teleportFallbackAttempts",
      ),
    };
  }

  return {
    decision: "terminal-stuck",
    reason:
      "All permitted recovery stages are exhausted.",
    nextState: state,
  };
}
