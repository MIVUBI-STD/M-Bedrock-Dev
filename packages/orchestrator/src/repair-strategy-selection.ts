import type { SemanticGraph } from "../../graph/src/graph.js";
import type { DiagnosticRepairDecision } from "../../project-model/src/diagnostic-decision.js";
import type { PatchTransaction } from "../../repair/src/types.js";
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
}

export interface RepairStrategySelectionPolicy {
  requiredInvariantIds?: readonly string[];
  allowGuarded?: boolean;
  blastRadiusPolicy?: RepairBlastRadiusPolicy;
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

function sameSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
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

function compareMetrics(
  left: RepairStrategyAssessment,
  right: RepairStrategyAssessment,
): number {
  const a = metricVector(left);
  const b = metricVector(right);
  for (let index = 0; index < a.length; index += 1) {
    const delta = a[index]! - b[index]!;
    if (delta !== 0) return delta;
  }
  return 0;
}

export function selectRepairStrategy(
  graph: SemanticGraph,
  diagnostic: DiagnosticRepairDecision,
  candidates: readonly RepairStrategyCandidate[],
  policy: RepairStrategySelectionPolicy = {},
): RepairStrategySelection {
  const requiredInvariantIds =
    [...new Set(policy.requiredInvariantIds ?? [])].sort();

  const assessments = candidates
    .map((candidate): RepairStrategyAssessment => {
      const pipeline = evaluateRepairAdmissionPipeline({
        graph,
        transaction: candidate.transaction,
        diagnostic,
        changedNodeIds: candidate.changedNodeIds,
        supportingInvariantIds:
          candidate.supportingInvariantIds,
        ...(policy.blastRadiusPolicy === undefined
          ? {}
          : { blastRadiusPolicy: policy.blastRadiusPolicy }),
      });

      const reasons: string[] = [];
      const invariantCoverage = coversRequiredInvariants(
        candidate.supportingInvariantIds,
        requiredInvariantIds,
      );
      if (!invariantCoverage) {
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
    .sort((a, b) =>
      compareMetrics(a, b) ||
      a.strategyId.localeCompare(b.strategyId)
    );

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

  const best = admissible[0]!;
  const tied = admissible.filter(
    (assessment) => compareMetrics(assessment, best) === 0,
  );

  if (tied.length > 1) {
    return {
      status: "ambiguous",
      tied,
      assessments,
      reasons: [
        "Multiple repair strategies are equally minimal under the deterministic selection dimensions.",
        "Human review or an additional discriminating criterion is required; lexical strategy id is not used as a winner.",
      ],
    };
  }

  return {
    status: "selected",
    selected: best,
    assessments,
  };
}
