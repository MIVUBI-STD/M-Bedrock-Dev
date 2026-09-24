import type {
  RepairBlastRadiusDecision,
  RepairBlastRadiusPolicy,
  RepairCounterfactualImpact,
} from "./counterfactual-types.js";

export const DEFAULT_REPAIR_BLAST_RADIUS_POLICY: RepairBlastRadiusPolicy = {
  maxAffectedNodes: 12,
  maxAffectedPaths: 6,
  maxAffectedKinds: 5,
  maxImpactDepth: 4,
  sensitiveKinds: [
    "world",
    "pack",
    "manifest",
    "script_module",
  ],
  blockOnUnresolvedTopology: true,
  blockOnAmbiguousTopology: true,
};

export function decideRepairBlastRadius(
  impact: RepairCounterfactualImpact,
  policy: RepairBlastRadiusPolicy = DEFAULT_REPAIR_BLAST_RADIUS_POLICY,
): RepairBlastRadiusDecision {
  const sensitiveKinds = impact.affectedKinds
    .filter((kind) => policy.sensitiveKinds.includes(kind))
    .sort();

  const reasons: string[] = [];

  if (impact.unknownChangedNodeIds.length > 0) {
    reasons.push(
      "One or more declared changed nodes do not exist in the semantic graph.",
    );
  }
  if (
    policy.blockOnUnresolvedTopology &&
    impact.unresolvedEdgeIds.length > 0
  ) {
    reasons.push(
      "Unresolved dependency edges touch the affected graph region.",
    );
  }
  if (
    policy.blockOnAmbiguousTopology &&
    impact.ambiguousEdgeIds.length > 0
  ) {
    reasons.push(
      "Ambiguous dependency edges touch the affected graph region.",
    );
  }

  if (
    impact.unknownChangedNodeIds.length > 0 ||
    !impact.graphCoverageComplete
  ) {
    return {
      transactionId: impact.transactionId,
      disposition: "indeterminate",
      affectedNodes: impact.affectedNodeIds.length,
      affectedPaths: impact.affectedPaths.length,
      affectedKinds: impact.affectedKinds,
      sensitiveKinds,
      reasons: reasons.length > 0
        ? reasons
        : ["Semantic graph coverage is incomplete for the proposed repair."],
    };
  }

  if (
    impact.affectedNodeIds.length > policy.maxAffectedNodes ||
    impact.affectedPaths.length > policy.maxAffectedPaths ||
    impact.affectedKinds.length > policy.maxAffectedKinds ||
    impact.maxImpactDepth > policy.maxImpactDepth
  ) {
    reasons.push(
      "Counterfactual impact exceeds the configured bounded-repair envelope for node count, path spread, component kinds, or transitive depth.",
    );
    return {
      transactionId: impact.transactionId,
      disposition: "blocked",
      affectedNodes: impact.affectedNodeIds.length,
      affectedPaths: impact.affectedPaths.length,
      affectedKinds: impact.affectedKinds,
      sensitiveKinds,
      reasons,
    };
  }

  if (sensitiveKinds.length > 0) {
    reasons.push(
      "The proposed repair can affect sensitive project-level components.",
    );
    return {
      transactionId: impact.transactionId,
      disposition: "review-required",
      affectedNodes: impact.affectedNodeIds.length,
      affectedPaths: impact.affectedPaths.length,
      affectedKinds: impact.affectedKinds,
      sensitiveKinds,
      reasons,
    };
  }

  const onlyChangedNodesAffected =
    impact.affectedNodeIds.length === impact.changedNodeIds.length;
  if (
    onlyChangedNodesAffected &&
    impact.affectedPaths.length <= 2
  ) {
    return {
      transactionId: impact.transactionId,
      disposition: "minimal",
      affectedNodes: impact.affectedNodeIds.length,
      affectedPaths: impact.affectedPaths.length,
      affectedKinds: impact.affectedKinds,
      sensitiveKinds,
      reasons: [
        "No reverse dependents are added beyond the explicitly changed nodes.",
      ],
    };
  }

  return {
    transactionId: impact.transactionId,
    disposition: "bounded",
    affectedNodes: impact.affectedNodeIds.length,
    affectedPaths: impact.affectedPaths.length,
    affectedKinds: impact.affectedKinds,
    sensitiveKinds,
    reasons: [
      "Counterfactual impact is fully resolved and remains within the configured bounded-repair envelope.",
    ],
  };
}
