import type {
  CrossDomainHypothesisAssessment,
  FindingReportProjection,
  MinimalProbeRecommendation,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  MapAuditOutputV2FindingReasoning,
} from "../map-audit-output-v2.js";

export function projectMapAuditFindingReasoning(input: {
  projection: FindingReportProjection;
  assessment: CrossDomainHypothesisAssessment;
  probe?: MinimalProbeRecommendation;
}): MapAuditOutputV2FindingReasoning {
  const evidenceChain = [
    ...input.assessment.supportingEvidenceIds,
    ...input.assessment.eliminatingEvidenceIds,
  ].filter((value, index, all) => all.indexOf(value) === index).sort();

  return {
    classification: input.projection.classification,
    confidence: input.assessment.confidence,
    evidenceDomains: [...input.assessment.domains],
    evidenceChain,
    unresolvedPredicates:
      [...input.assessment.missingRequiredPredicates].sort(),
    ...(input.probe?.predicate
      ? { recommendedValidation: input.probe.predicate }
      : {}),
    ...(input.probe?.probeId
      ? { recommendedProbeId: input.probe.probeId }
      : {}),
  };
}
