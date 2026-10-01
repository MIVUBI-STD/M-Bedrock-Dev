import type {
  ArenaRegionContract,
} from "../../../project-model/src/index.js";
import {
  resolveSpatialAuthority,
  validateSpatialAuthorityPolicy,
  type SpatialAuthorityAction,
  type SpatialAuthorityActor,
  type SpatialAuthorityPolicy,
  type SpatialAuthorityQuery,
} from "../../../behavior-model/src/index.js";

export interface SpatialAuthorityCoverageRequirement {
  regionId: string;
  actor: SpatialAuthorityActor;
  action: SpatialAuthorityAction;
  phase?: string;
}

export interface SpatialAuthorityCoverageAssessment {
  requirement: SpatialAuthorityCoverageRequirement;
  status: "resolved" | "uncovered" | "conflict" | "unknown-region";
  decision?: "allow" | "deny";
  matchedRuleIds: readonly string[];
  reason: string;
}

export interface SpatialAuthorityCoverageReport {
  policyId: string;
  policyValid: boolean;
  policyErrors: readonly string[];
  knownRegions: readonly string[];
  referencedUnknownRegions: readonly string[];
  resolved: number;
  uncovered: number;
  conflicts: number;
  unknownRegions: number;
  assessments: readonly SpatialAuthorityCoverageAssessment[];
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function analyzeSpatialAuthorityCoverage(
  regions: readonly ArenaRegionContract[],
  policy: SpatialAuthorityPolicy,
  requirements: readonly SpatialAuthorityCoverageRequirement[],
): SpatialAuthorityCoverageReport {
  const policyErrors =
    validateSpatialAuthorityPolicy(policy);
  const knownRegions = uniqueSorted(
    regions.map((region) => region.id),
  );
  const known = new Set(knownRegions);
  const referencedUnknownRegions = uniqueSorted(
    policy.rules
      .map((rule) => rule.regionId)
      .filter((regionId) => !known.has(regionId)),
  );

  const assessments =
    requirements.map((requirement): SpatialAuthorityCoverageAssessment => {
      if (!known.has(requirement.regionId)) {
        return {
          requirement,
          status: "unknown-region",
          matchedRuleIds: [],
          reason:
            "Spatial authority requirement references a region that is not present in the arena region contract set.",
        };
      }

      const query: SpatialAuthorityQuery = {
        regionId: requirement.regionId,
        actor: requirement.actor,
        action: requirement.action,
        ...(requirement.phase === undefined
          ? {}
          : { phase: requirement.phase }),
      };
      const resolution =
        resolveSpatialAuthority(policy, query);
      return {
        requirement,
        status: resolution.status,
        ...(resolution.decision === undefined
          ? {}
          : { decision: resolution.decision }),
        matchedRuleIds:
          resolution.matchedRuleIds,
        reason: resolution.reason,
      };
    });

  return {
    policyId: policy.id,
    policyValid:
      policyErrors.length === 0 &&
      referencedUnknownRegions.length === 0,
    policyErrors,
    knownRegions,
    referencedUnknownRegions,
    resolved: assessments.filter(
      (item) => item.status === "resolved",
    ).length,
    uncovered: assessments.filter(
      (item) => item.status === "uncovered",
    ).length,
    conflicts: assessments.filter(
      (item) => item.status === "conflict",
    ).length,
    unknownRegions: assessments.filter(
      (item) => item.status === "unknown-region",
    ).length,
    assessments,
  };
}
