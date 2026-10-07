import type {
  CrossDomainHypothesisAssessment,
} from "./cross-domain-reasoning.js";
import type {
  DiagnosticProbeCandidate,
  DiagnosticProbeScore,
} from "./types.js";
import {
  rankDiagnosticProbes,
} from "./planner.js";

export interface MinimalProbeRecommendation {
  hypothesisId: string;
  predicate: string;
  probeId?: string;
  score?: DiagnosticProbeScore;
  disposition:
    | "probe-selected"
    | "missing-probe"
    | "no-probe-needed";
}

export function planMinimalCrossDomainProbes(
  assessments: readonly CrossDomainHypothesisAssessment[],
  probes: readonly DiagnosticProbeCandidate[],
): MinimalProbeRecommendation[] {
  const active = assessments.filter(
    (item) => item.disposition !== "eliminated",
  );
  const ranked = rankDiagnosticProbes(probes, active);
  const scoreById = new Map(ranked.map((score) => [score.probeId, score] as const));

  return active.map((assessment) => {
    if (!assessment.nextPredicate) {
      return {
        hypothesisId: assessment.hypothesisId,
        predicate: "",
        disposition: "no-probe-needed" as const,
      };
    }

    const candidates = probes
      .filter((probe) => probe.predicate === assessment.nextPredicate)
      .map((probe) => ({
        probe,
        score: scoreById.get(probe.id),
      }))
      .filter((item): item is {
        probe: DiagnosticProbeCandidate;
        score: DiagnosticProbeScore;
      } => item.score !== undefined)
      .sort((a, b) =>
        b.score.utility - a.score.utility ||
        a.score.risk - b.score.risk ||
        a.score.cost - b.score.cost ||
        a.probe.id.localeCompare(b.probe.id)
      );

    const selected = candidates[0];
    if (!selected) {
      return {
        hypothesisId: assessment.hypothesisId,
        predicate: assessment.nextPredicate,
        disposition: "missing-probe" as const,
      };
    }

    return {
      hypothesisId: assessment.hypothesisId,
      predicate: assessment.nextPredicate,
      probeId: selected.probe.id,
      score: selected.score,
      disposition: "probe-selected" as const,
    };
  });
}
