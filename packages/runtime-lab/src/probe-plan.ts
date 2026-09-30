import type {
  DiagnosticProbeScore,
} from "../../diagnostic-reasoning/src/index.js";

export interface RuntimeProbeTemplate {
  probeId: string;
  title: string;
  goal: string;
  setup: readonly string[];
  steps: readonly string[];
  expectedEvidence: readonly string[];
  mutationRisk: "read-only" | "guarded" | "mutating";
}

export interface RuntimeProbePlan {
  selected?: RuntimeProbeTemplate;
  alternatives: readonly RuntimeProbeTemplate[];
  reason: string;
}

export function selectRuntimeProbePlan(
  rankedScores: readonly DiagnosticProbeScore[],
  templates: readonly RuntimeProbeTemplate[],
): RuntimeProbePlan {
  const byId = new Map(templates.map((item) => [item.probeId, item]));
  const rankedTemplates = rankedScores
    .map((score) => byId.get(score.probeId))
    .filter((item): item is RuntimeProbeTemplate => item !== undefined);

  const selected = rankedTemplates[0];
  return {
    ...(selected ? { selected } : {}),
    alternatives: rankedTemplates.slice(1),
    reason: selected
      ? "Selected the highest-ranked available diagnostic probe template; re-plan after collecting its evidence."
      : "No ranked diagnostic probe has an executable runtime template.",
  };
}
