import type {
  DiagnosticEvidenceObservation,
  DiagnosticHypothesis,
  DiagnosticHypothesisSet,
  HypothesisAssessment,
} from "./types.js";

function latestEvidence(
  evidence: readonly DiagnosticEvidenceObservation[],
): ReadonlyMap<string, DiagnosticEvidenceObservation> {
  const map = new Map<
    string,
    DiagnosticEvidenceObservation
  >();
  for (const item of evidence) {
    map.set(item.predicate, item);
  }
  return map;
}

function evidenceId(
  item: DiagnosticEvidenceObservation,
): string {
  return item.evidenceId ??
    "predicate:" +
      item.predicate +
      ":" +
      item.state;
}

function assessOne(
  hypothesis: DiagnosticHypothesis,
  byPredicate: ReadonlyMap<
    string,
    DiagnosticEvidenceObservation
  >,
): HypothesisAssessment {
  const supportingEvidenceIds: string[] = [];
  const eliminatingEvidenceIds: string[] = [];
  const missingRequiredPredicates: string[] = [];
  const reasons: string[] = [];

  for (
    const predicate of
      hypothesis.falsifierPredicates ?? []
  ) {
    const item = byPredicate.get(predicate);
    if (item?.state === "present") {
      eliminatingEvidenceIds.push(
        evidenceId(item),
      );
      reasons.push(
        "Falsifier observed: " +
          predicate +
          ".",
      );
    }
  }

  for (
    const predicate of
      hypothesis.requiredPredicates ?? []
  ) {
    const item = byPredicate.get(predicate);
    if (!item || item.state === "unknown") {
      missingRequiredPredicates.push(predicate);
      continue;
    }
    if (item.state === "absent") {
      eliminatingEvidenceIds.push(
        evidenceId(item),
      );
      reasons.push(
        "Required predicate is absent: " +
          predicate +
          ".",
      );
    } else {
      supportingEvidenceIds.push(
        evidenceId(item),
      );
    }
  }

  for (
    const predicate of
      hypothesis.supportingPredicates ?? []
  ) {
    const item = byPredicate.get(predicate);
    if (item?.state === "present") {
      supportingEvidenceIds.push(
        evidenceId(item),
      );
    }
  }

  if (eliminatingEvidenceIds.length > 0) {
    return {
      hypothesisId: hypothesis.id,
      disposition: "eliminated",
      supportingEvidenceIds,
      eliminatingEvidenceIds,
      missingRequiredPredicates,
      reasons,
    };
  }

  const requiredComplete =
    missingRequiredPredicates.length === 0;
  const hasRequired =
    (hypothesis.requiredPredicates?.length ??
      0) > 0;
  const hasSupport =
    supportingEvidenceIds.length > 0;

  return {
    hypothesisId: hypothesis.id,
    disposition:
      requiredComplete &&
      (hasRequired || hasSupport)
        ? "supported"
        : "open",
    supportingEvidenceIds,
    eliminatingEvidenceIds,
    missingRequiredPredicates,
    reasons: [
      ...reasons,
      ...(requiredComplete &&
      (hasRequired || hasSupport)
        ? [
            "Observed evidence satisfies the declared support contract.",
          ]
        : [
            "The hypothesis remains open because evidence is incomplete or non-discriminating.",
          ]),
    ],
  };
}

export function assessDiagnosticHypotheses(
  set: DiagnosticHypothesisSet,
  evidence: readonly DiagnosticEvidenceObservation[],
): HypothesisAssessment[] {
  const byPredicate = latestEvidence(evidence);
  return set.hypotheses.map((hypothesis) =>
    assessOne(hypothesis, byPredicate)
  );
}
