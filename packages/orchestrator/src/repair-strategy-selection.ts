import type { SemanticGraph } from "../../graph/src/index.js";
import type { DiagnosticRepairDecision, DiagnosticClaimStrength } from "../../project-model/src/index.js";
import type { InvariantRegistrySnapshot } from "../../project-model/src/index.js";
import {
  validateInvariantRegistrySnapshot,
} from "../../project-model/src/index.js";
import type { DecisionBasisRevision } from "../../project-model/src/index.js";
import type { PatchTransaction } from "../../repair/src/index.js";
import type { PreservationReadinessResult } from "../../preservation/src/index.js";
import {
  evaluateRepairAdmissionPipeline,
  type RepairAdmissionPipelineResult,
} from "./repair-admission-pipeline.js";
import type {
  RepairBlastRadiusPolicy,
} from "./repair-counterfactual-types.js";

export interface RepairStrategyCandidate {
  strategyId: string;
  transaction: PatchTransaction;
  changedNodeIds: readonly string[];
  supportingInvariantIds: readonly string[];
  addressesCandidateIds: readonly string[];
}

export interface RepairStrategySelectionPolicy {
  invariantRegistry: InvariantRegistrySnapshot;
  requiredInvariantIds: readonly string[];
  allowGuarded?: boolean;
  blastRadiusPolicy?: RepairBlastRadiusPolicy;
  preservationReadiness?: PreservationReadinessResult;
  decisionBasis?: Omit<
    DecisionBasisRevision,
    "sourceFingerprint" | "graphFingerprint" | "invariantRegistryRevision"
  >;
}

export interface RepairStrategyAssessment {
  strategyId: string;
  transactionId: string;
  admissible: boolean;
  reasons: readonly string[];
  pipeline: RepairAdmissionPipelineResult;
  metrics: {
    admissionRank: number;
    blastRadiusRank: number;
    affectedNodes: number;
    affectedPaths: number;
    sensitiveKinds: number;
    impactDepth: number;
    changedNodes: number;
    operations: number;
  };
}

export type RepairStrategySelection =
  | {
      status: "selected";
      selected: RepairStrategyAssessment;
      assessments: readonly RepairStrategyAssessment[];
    }
  | {
      status: "ambiguous";
      tied: readonly RepairStrategyAssessment[];
      assessments: readonly RepairStrategyAssessment[];
      reasons: readonly string[];
    }
  | {
      status: "none-eligible";
      assessments: readonly RepairStrategyAssessment[];
      reasons: readonly string[];
    };

function claimRank(
  claim: DiagnosticClaimStrength,
): number {
  switch (claim) {
    case "hypothesis":
      return 0;
    case "corroborated":
      return 1;
    case "proven-static":
      return 2;
    case "proven-runtime":
      return 3;
  }
}

function admissionRank(
  disposition: RepairAdmissionPipelineResult["admission"]["disposition"],
): number {
  switch (disposition) {
    case "eligible":
      return 0;
    case "guarded":
      return 1;
    case "review-required":
      return 2;
    case "blocked":
      return 3;
  }
}

function blastRadiusRank(
  disposition: RepairAdmissionPipelineResult["blastRadius"]["disposition"],
): number {
  switch (disposition) {
    case "minimal":
      return 0;
    case "bounded":
      return 1;
    case "review-required":
      return 2;
    case "indeterminate":
      return 3;
    case "blocked":
      return 4;
  }
}

function coversRequiredInvariants(
  actual: readonly string[],
  required: readonly string[],
): boolean {
  const set = new Set(actual);
  return required.every((id) => set.has(id));
}

function metricVector(
  item: RepairStrategyAssessment,
): readonly number[] {
  return [
    item.metrics.admissionRank,
    item.metrics.blastRadiusRank,
    item.metrics.sensitiveKinds,
    item.metrics.affectedNodes,
    item.metrics.affectedPaths,
    item.metrics.impactDepth,
    item.metrics.changedNodes,
    item.metrics.operations,
  ];
}

function dominates(
  left: RepairStrategyAssessment,
  right: RepairStrategyAssessment,
): boolean {
  const a = metricVector(left);
  const b = metricVector(right);
  let strictlyBetter = false;

  for (let index = 0; index < a.length; index += 1) {
    if (a[index]! > b[index]!) return false;
    if (a[index]! < b[index]!) strictlyBetter = true;
  }

  return strictlyBetter;
}

export function selectRepairStrategy(
  graph: SemanticGraph,
  diagnostic: DiagnosticRepairDecision,
  candidates: readonly RepairStrategyCandidate[],
  policy: RepairStrategySelectionPolicy,
): RepairStrategySelection {
  const registryErrors = validateInvariantRegistrySnapshot(
    policy.invariantRegistry,
  );
  if (registryErrors.length > 0) {
    throw new Error(
      "Invalid invariant registry for repair strategy selection: " +
        registryErrors.join("; "),
    );
  }

  const strategyIds = new Set<string>();
  const transactionIds = new Set<string>();
  for (const candidate of candidates) {
    if (strategyIds.has(candidate.strategyId)) {
      throw new Error(
        "Duplicate repair strategy id: " + candidate.strategyId,
      );
    }
    if (transactionIds.has(candidate.transaction.id)) {
      throw new Error(
        "Repair strategies must not alias the same patch transaction: " +
          candidate.transaction.id,
      );
    }
    strategyIds.add(candidate.strategyId);
    transactionIds.add(candidate.transaction.id);
  }

  const requiredInvariantIds =
    [...new Set(policy.requiredInvariantIds)].sort();

  if (requiredInvariantIds.length === 0) {
    throw new Error(
      "Repair strategy selection requires at least one required invariant.",
    );
  }

  const registryById = new Map(
    policy.invariantRegistry.entries.map((entry) => [
      entry.id,
      entry,
    ]),
  );

  const missingRequired = requiredInvariantIds.filter(
    (id) => !registryById.has(id),
  );
  if (missingRequired.length > 0) {
    throw new Error(
      "Required repair invariant is not present in invariant registry: " +
        missingRequired.join(", "),
    );
  }

  const requiredInvariantIssues: string[] = [];
  for (const id of requiredInvariantIds) {
    const invariant = registryById.get(id)!;
    if (invariant.enforcement === "diagnostic-only") {
      requiredInvariantIssues.push(
        "Required invariant " + id +
          " is diagnostic-only and cannot authorize automatic strategy selection.",
      );
    }
    if (
      claimRank(diagnostic.claimStrength) <
      claimRank(invariant.minimumRepairClaim)
    ) {
      requiredInvariantIssues.push(
        "Diagnostic claim strength " +
          diagnostic.claimStrength +
          " is below invariant minimum " +
          invariant.minimumRepairClaim +
          " for " +
          id +
          ".",
      );
    }
  }

  const assessments = candidates
    .map((candidate): RepairStrategyAssessment => {
      const pipeline = evaluateRepairAdmissionPipeline({
        graph,
        transaction: candidate.transaction,
        diagnostic,
        changedNodeIds: candidate.changedNodeIds,
        supportingInvariantIds:
          candidate.supportingInvariantIds,
        decisionBasis: {
          ...(policy.decisionBasis ?? {}),
          invariantRegistryRevision:
            policy.invariantRegistry.revision,
        },
        ...(policy.blastRadiusPolicy === undefined
          ? {}
          : { blastRadiusPolicy: policy.blastRadiusPolicy }),
        ...(policy.preservationReadiness === undefined
          ? {}
          : {
              preservationReadiness:
                policy.preservationReadiness,
            }),
      });

      const reasons: string[] = [];
      const addressesSelectedCandidate =
        diagnostic.selectedCandidateId !== undefined &&
        candidate.addressesCandidateIds.includes(
          diagnostic.selectedCandidateId,
        );
      if (!addressesSelectedCandidate) {
        reasons.push(
          diagnostic.selectedCandidateId === undefined
            ? "Diagnostic decision has no selected root-cause candidate."
            : "Strategy does not address the selected root-cause candidate: " +
                diagnostic.selectedCandidateId +
                ".",
        );
      }

      const unknownSupportingInvariantIds =
        candidate.supportingInvariantIds.filter(
          (id) => !registryById.has(id),
        );
      if (unknownSupportingInvariantIds.length > 0) {
        reasons.push(
          "Strategy references invariant(s) outside the active registry: " +
            unknownSupportingInvariantIds.sort().join(", ") +
            ".",
        );
      }

      const invariantCoverage =
        requiredInvariantIssues.length === 0 &&
        unknownSupportingInvariantIds.length === 0 &&
        coversRequiredInvariants(
          candidate.supportingInvariantIds,
          requiredInvariantIds,
        );
      if (requiredInvariantIssues.length > 0) {
        reasons.push(...requiredInvariantIssues);
      }
      if (
        requiredInvariantIssues.length === 0 &&
        !invariantCoverage
      ) {
        reasons.push(
          "Strategy does not cover every required supporting invariant.",
        );
      }

      if (candidate.transaction.validation.length === 0) {
        reasons.push(
          "Strategy has no concrete post-mutation validation step.",
        );
      }

      const admissionAllowed =
        pipeline.admission.disposition === "eligible" ||
        (
          pipeline.admission.disposition === "guarded" &&
          policy.allowGuarded === true
        );

      if (!admissionAllowed) {
        reasons.push(
          "Repair admission disposition is not selectable under the current strategy policy: " +
            pipeline.admission.disposition +
            ".",
        );
      }

      return {
        strategyId: candidate.strategyId,
        transactionId: candidate.transaction.id,
        admissible:
          addressesSelectedCandidate &&
          invariantCoverage &&
          candidate.transaction.validation.length > 0 &&
          admissionAllowed,
        reasons,
        pipeline,
        metrics: {
          admissionRank: admissionRank(
            pipeline.admission.disposition,
          ),
          blastRadiusRank: blastRadiusRank(
            pipeline.blastRadius.disposition,
          ),
          affectedNodes:
            pipeline.impact.affectedNodeIds.length,
          affectedPaths:
            pipeline.impact.affectedPaths.length,
          sensitiveKinds:
            pipeline.blastRadius.sensitiveKinds.length,
          impactDepth: pipeline.impact.maxImpactDepth,
          changedNodes: candidate.changedNodeIds.length,
          operations: candidate.transaction.operations.length,
        },
      };
    })
    .sort((a, b) => a.strategyId.localeCompare(b.strategyId));

  const admissible = assessments.filter(
    (assessment) => assessment.admissible,
  );

  if (admissible.length === 0) {
    return {
      status: "none-eligible",
      assessments,
      reasons: [
        "No repair strategy satisfies diagnostic authorization, invariant coverage, validation, and blast-radius policy.",
      ],
    };
  }

  const frontier = admissible.filter(
    (candidate) =>
      !admissible.some(
        (other) =>
          other !== candidate &&
          dominates(other, candidate),
      ),
  );

  if (frontier.length > 1) {
    return {
      status: "ambiguous",
      tied: frontier,
      assessments,
      reasons: [
        "Multiple repair strategies remain on the non-dominated Pareto frontier.",
        "No strategy is better or equal on every safety/impact dimension while being strictly better on at least one.",
        "Human review or an additional explicit policy criterion is required.",
      ],
    };
  }

  return {
    status: "selected",
    selected: frontier[0]!,
    assessments,
  };
}
