import type {
  DiagnosticProbeDefinition,
  DiagnosticProbePlan,
  DiagnosticProbePlanItem,
  RuntimeProbeBinding,
  RuntimeProbeRequest,
  RuntimeScope,
} from "../../../project-model/src/index.js";
import type {
  CrossDomainHypothesisAssessment,
  DiagnosticProbeCandidate,
} from "../../../diagnostic-reasoning/src/index.js";
import {
  planMinimalCrossDomainProbes,
} from "../../../diagnostic-reasoning/src/index.js";
import {
  compileRuntimeProbeRequests,
} from "./runtime-probe-request-compiler.js";

export interface CrossDomainRuntimeProbeCompilation {
  plan: DiagnosticProbePlan;
  requests: RuntimeProbeRequest[];
  issues: ReturnType<typeof compileRuntimeProbeRequests>["issues"];
}

function item(
  recommendation: ReturnType<typeof planMinimalCrossDomainProbes>[number],
  definition: DiagnosticProbeDefinition,
): DiagnosticProbePlanItem {
  return {
    probeId: definition.id,
    label: definition.label,
    requiredContext: definition.requiredContext,
    costUnits: definition.costUnits,
    mutationRisk: definition.mutationRisk,
    coveredCandidateIds: [recommendation.hypothesisId],
    pairSeparationCount: recommendation.score?.pairwiseSeparations ?? 0,
    score: recommendation.score?.utility ?? 0,
    ...(definition.rationale ? { rationale: definition.rationale } : {}),
  };
}

export function compileMinimalCrossDomainRuntimeProbes(
  incidentId: string,
  assessments: readonly CrossDomainHypothesisAssessment[],
  candidates: readonly DiagnosticProbeCandidate[],
  definitions: readonly DiagnosticProbeDefinition[],
  bindings: readonly RuntimeProbeBinding[],
  options: {
    scope?: RuntimeScope;
    runtimeTick?: number;
    maxRequests?: number;
  } = {},
): CrossDomainRuntimeProbeCompilation {
  const recommendations =
    planMinimalCrossDomainProbes(assessments, candidates);
  const definitionsById = new Map(
    definitions.map((definition) => [definition.id, definition] as const),
  );
  const recommended: DiagnosticProbePlanItem[] = [];
  const blockedByContext: DiagnosticProbePlanItem[] = [];

  for (const recommendation of recommendations) {
    if (
      recommendation.disposition !== "probe-selected" ||
      !recommendation.probeId
    ) continue;
    const definition = definitionsById.get(recommendation.probeId);
    if (!definition) continue;
    const target =
      definition.requiredContext === "LIVE_MINECRAFT" &&
      definition.mutationRisk === "read-only"
        ? recommended
        : blockedByContext;
    target.push(item(recommendation, definition));
  }

  const unresolvedCandidateIds = assessments
    .filter((assessment) =>
      assessment.disposition !== "eliminated" &&
      assessment.nextPredicate !== undefined
    )
    .map((assessment) => assessment.hypothesisId)
    .sort();

  const plan: DiagnosticProbePlan = {
    incidentId,
    availableContext: "LIVE_MINECRAFT",
    unresolvedCandidateIds,
    recommended,
    blockedByContext,
    stopCondition:
      unresolvedCandidateIds.length === 0
        ? "no-probe-required"
        : recommended.length === 0
          ? "candidate-set-not-discriminable"
          : "candidate-set-exhausted",
  };

  const compiled = compileRuntimeProbeRequests(
    plan,
    definitions,
    bindings,
    options,
  );

  return {
    plan,
    requests: compiled.requests,
    issues: compiled.issues,
  };
}
