import {
  projectPolicyProvenance,
} from "../provenance.js";
import type {
  BehaviorClaimProvenance,
} from "../provenance.js";

export type SpatialAuthorityActor =
  | "player"
  | "entity"
  | "system";

export type SpatialAuthorityAction =
  | "place-block"
  | "break-block"
  | "interact-block"
  | "use-item"
  | "use-container"
  | "teleport"
  | "spawn-entity"
  | "place-structure"
  | "mutate-blocks";

export type SpatialAuthorityDecision =
  | "allow"
  | "deny";

export interface SpatialAuthorityRule {
  id: string;
  regionId: string;
  actor: SpatialAuthorityActor | "*";
  action: SpatialAuthorityAction | "*";
  phases?: readonly string[];
  decision: SpatialAuthorityDecision;
  provenance?: BehaviorClaimProvenance;
  rationale?: string;
}

export interface SpatialAuthorityBehaviorContract {
  schemaVersion: 1;
  id: string;
  rules: readonly SpatialAuthorityRule[];
}

/** @deprecated Use SpatialAuthorityBehaviorContract. */
export type SpatialAuthorityPolicy = SpatialAuthorityBehaviorContract;

export interface SpatialAuthorityQuery {
  regionId: string;
  actor: SpatialAuthorityActor;
  action: SpatialAuthorityAction;
  phase?: string;
}

export type SpatialAuthorityResolutionStatus =
  | "resolved"
  | "uncovered"
  | "conflict";

export interface SpatialAuthorityResolution {
  query: SpatialAuthorityQuery;
  status: SpatialAuthorityResolutionStatus;
  decision?: SpatialAuthorityDecision;
  matchedRuleIds: readonly string[];
  reason: string;
}

const provenance = projectPolicyProvenance(
  "behavior-spec:spatial-authority-v1",
  "Spatial authority is authored/project contract. Region geometry is owned separately and this model never infers gameplay permission from voxel comparison roles.",
);

export function spatialAuthorityBehaviorContractProvenance(): BehaviorClaimProvenance {
  return provenance;
}

function phaseMatches(
  rule: SpatialAuthorityRule,
  phase: string | undefined,
): boolean {
  if (!rule.phases || rule.phases.length === 0) {
    return true;
  }
  return phase !== undefined &&
    rule.phases.includes(phase);
}

function specificity(
  rule: SpatialAuthorityRule,
): number {
  return (
    (rule.actor === "*" ? 0 : 2) +
    (rule.action === "*" ? 0 : 2) +
    (rule.phases && rule.phases.length > 0 ? 1 : 0)
  );
}

export function validateSpatialAuthorityBehaviorContract(
  contract: SpatialAuthorityBehaviorContract,
): string[] {
  const errors: string[] = [];
  if (contract.schemaVersion !== 1) {
    errors.push(
      "Spatial Authority Behavior Contract schemaVersion must be 1.",
    );
  }
  if (!contract.id.trim()) {
    errors.push(
      "Spatial Authority Behavior Contract id must be non-empty.",
    );
  }

  const ids = new Set<string>();
  for (const rule of contract.rules) {
    if (!rule.id.trim()) {
      errors.push(
        "Spatial authority rule id must be non-empty.",
      );
    }
    if (ids.has(rule.id)) {
      errors.push(
        "Duplicate spatial authority rule id: " +
          rule.id +
          ".",
      );
    }
    ids.add(rule.id);

    if (!rule.regionId.trim()) {
      errors.push(
        "Spatial authority rule " +
          rule.id +
          " requires a non-empty regionId.",
      );
    }
    if (
      rule.phases?.some(
        (phase) => !phase.trim(),
      )
    ) {
      errors.push(
        "Spatial authority rule " +
          rule.id +
          " contains an empty phase.",
      );
    }
  }

  return errors;
}

export function resolveSpatialAuthorityContract(
  contract: SpatialAuthorityBehaviorContract,
  query: SpatialAuthorityQuery,
): SpatialAuthorityResolution {
  const validationErrors =
    validateSpatialAuthorityBehaviorContract(contract);
  if (validationErrors.length > 0) {
    return {
      query,
      status: "conflict",
      matchedRuleIds: [],
      reason:
        "Spatial Authority Behavior Contract is invalid: " +
        validationErrors.join(" "),
    };
  }

  const candidates = contract.rules.filter(
    (rule) =>
      rule.regionId === query.regionId &&
      (rule.actor === "*" ||
        rule.actor === query.actor) &&
      (rule.action === "*" ||
        rule.action === query.action) &&
      phaseMatches(rule, query.phase),
  );

  if (candidates.length === 0) {
    return {
      query,
      status: "uncovered",
      matchedRuleIds: [],
      reason:
        "No authored spatial authority rule covers this actor/action/region/phase query.",
    };
  }

  const maxSpecificity = Math.max(
    ...candidates.map(specificity),
  );
  const selected = candidates.filter(
    (rule) =>
      specificity(rule) === maxSpecificity,
  );
  const decisions = new Set(
    selected.map((rule) => rule.decision),
  );

  if (decisions.size > 1) {
    return {
      query,
      status: "conflict",
      matchedRuleIds: selected
        .map((rule) => rule.id)
        .sort(),
      reason:
        "Equally specific spatial authority rules disagree; automatic permission resolution is forbidden.",
    };
  }

  return {
    query,
    status: "resolved",
    decision: selected[0]!.decision,
    matchedRuleIds: selected
      .map((rule) => rule.id)
      .sort(),
    reason:
      "Resolved from the most-specific authored spatial authority rule set.",
  };
}

/** @deprecated Use spatialAuthorityBehaviorContractProvenance. */
export const spatialAuthorityPolicyProvenance = spatialAuthorityBehaviorContractProvenance;
/** @deprecated Use validateSpatialAuthorityBehaviorContract. */
export const validateSpatialAuthorityPolicy = validateSpatialAuthorityBehaviorContract;
/** @deprecated Use resolveSpatialAuthorityContract. */
export const resolveSpatialAuthority = resolveSpatialAuthorityContract;
