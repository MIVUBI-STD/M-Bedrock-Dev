import type {
  DiagnosticProbeCandidate,
  DiagnosticProbeScore,
  HypothesisAssessment,
} from "./types.js";

export interface DiagnosticProbePlanningOptions {
  costWeight?: number;
  riskWeight?: number;
}

export function scoreDiagnosticProbe(
  probe: DiagnosticProbeCandidate,
  openHypothesisIds: ReadonlySet<string>,
  options: DiagnosticProbePlanningOptions = {},
): DiagnosticProbeScore {
  if (!Number.isFinite(probe.cost) || probe.cost < 0) {
    throw new Error(
      "Diagnostic probe cost must be finite and non-negative.",
    );
  }
  if (!Number.isFinite(probe.risk) || probe.risk < 0) {
    throw new Error(
      "Diagnostic probe risk must be finite and non-negative.",
    );
  }

  const predictions = probe.predictions.filter(
    (prediction) =>
      openHypothesisIds.has(
        prediction.hypothesisId,
      ),
  );

  let pairwiseSeparations = 0;
  for (
    let left = 0;
    left < predictions.length;
    left += 1
  ) {
    for (
      let right = left + 1;
      right < predictions.length;
      right += 1
    ) {
      if (
        predictions[left]!.state !==
        predictions[right]!.state
      ) {
        pairwiseSeparations += 1;
      }
    }
  }

  const costWeight =
    options.costWeight ?? 1;
  const riskWeight =
    options.riskWeight ?? 2;
  const penalty =
    probe.cost * costWeight +
    probe.risk * riskWeight;

  return {
    probeId: probe.id,
    pairwiseSeparations,
    coveredHypotheses: predictions.length,
    cost: probe.cost,
    risk: probe.risk,
    utility:
      pairwiseSeparations +
      predictions.length * 0.1 -
      penalty,
  };
}

export function rankDiagnosticProbes(
  probes: readonly DiagnosticProbeCandidate[],
  assessments: readonly HypothesisAssessment[],
  options: DiagnosticProbePlanningOptions = {},
): DiagnosticProbeScore[] {
  const open = new Set(
    assessments
      .filter(
        (item) =>
          item.disposition !== "eliminated",
      )
      .map((item) => item.hypothesisId),
  );

  return probes
    .map((probe) =>
      scoreDiagnosticProbe(
        probe,
        open,
        options,
      )
    )
    .sort(
      (left, right) =>
        right.utility - left.utility ||
        right.pairwiseSeparations -
          left.pairwiseSeparations ||
        left.probeId.localeCompare(
          right.probeId,
        ),
    );
}
