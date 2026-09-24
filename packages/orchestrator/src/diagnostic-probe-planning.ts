import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type {
  DiagnosticExecutionContext,
  DiagnosticProbeDefinition,
  DiagnosticProbePlan,
  DiagnosticProbePlanItem,
} from "../../project-model/src/diagnostic-probe.js";

const contextRank: Readonly<Record<DiagnosticExecutionContext, number>> = {
  REMOTE_GITHUB: 0,
  LOCAL_ARTIFACT: 1,
  LOCAL_MINECRAFT: 2,
  LIVE_MINECRAFT: 3,
};

const mutationPenalty = {
  "read-only": 0,
  guarded: 1,
  mutating: 3,
} as const;

function candidateSignature(
  candidateId: string,
  probe: DiagnosticProbeDefinition,
): string {
  return probe.outcomes.map((outcome) => {
    if (outcome.supportsCandidateIds?.includes(candidateId)) return "S";
    if (outcome.rejectsCandidateIds?.includes(candidateId)) return "R";
    return "U";
  }).join("");
}

function planItem(
  candidateIds: readonly string[],
  probe: DiagnosticProbeDefinition,
): DiagnosticProbePlanItem | undefined {
  const candidateSet = new Set(candidateIds);
  const covered = new Set<string>();

  for (const outcome of probe.outcomes) {
    for (const id of outcome.supportsCandidateIds ?? []) {
      if (candidateSet.has(id)) covered.add(id);
    }
    for (const id of outcome.rejectsCandidateIds ?? []) {
      if (candidateSet.has(id)) covered.add(id);
    }
  }

  let pairSeparationCount = 0;
  for (let left = 0; left < candidateIds.length; left += 1) {
    for (let right = left + 1; right < candidateIds.length; right += 1) {
      const a = candidateIds[left]!;
      const b = candidateIds[right]!;
      if (candidateSignature(a, probe) !== candidateSignature(b, probe)) {
        pairSeparationCount += 1;
      }
    }
  }

  const useful =
    pairSeparationCount > 0 ||
    (candidateIds.length === 1 && covered.has(candidateIds[0]!));
  if (!useful) return undefined;

  const effectiveCost =
    Math.max(1, probe.costUnits) + mutationPenalty[probe.mutationRisk];
  const score = Number(
    ((pairSeparationCount * 10 + covered.size * 2) / effectiveCost).toFixed(4),
  );

  return {
    probeId: probe.id,
    label: probe.label,
    requiredContext: probe.requiredContext,
    costUnits: probe.costUnits,
    mutationRisk: probe.mutationRisk,
    coveredCandidateIds: [...covered].sort(),
    pairSeparationCount,
    score,
    ...(probe.rationale === undefined ? {} : { rationale: probe.rationale }),
  };
}

function comparePlanItems(
  a: DiagnosticProbePlanItem,
  b: DiagnosticProbePlanItem,
): number {
  return (
    b.score - a.score ||
    b.pairSeparationCount - a.pairSeparationCount ||
    a.costUnits - b.costUnits ||
    a.probeId.localeCompare(b.probeId)
  );
}

export function planDiagnosticProbes(
  incident: CausalIncident,
  probes: readonly DiagnosticProbeDefinition[],
  availableContext: DiagnosticExecutionContext,
): DiagnosticProbePlan {
  const unresolvedCandidateIds = incident.rootCauseCandidates
    .filter((candidate) =>
      candidate.evidenceLevel !== "proven-with-observed-outcome"
    )
    .map((candidate) => candidate.id)
    .sort();

  if (unresolvedCandidateIds.length === 0) {
    return {
      incidentId: incident.id,
      availableContext,
      unresolvedCandidateIds,
      recommended: [],
      blockedByContext: [],
      stopCondition: "no-probe-required",
    };
  }

  const items = probes
    .map((probe) => planItem(unresolvedCandidateIds, probe))
    .filter((item): item is DiagnosticProbePlanItem => item !== undefined);

  const recommended = items
    .filter((item) =>
      contextRank[item.requiredContext] <= contextRank[availableContext]
    )
    .sort(comparePlanItems);

  const blockedByContext = items
    .filter((item) =>
      contextRank[item.requiredContext] > contextRank[availableContext]
    )
    .sort((a, b) =>
      contextRank[a.requiredContext] - contextRank[b.requiredContext] ||
      comparePlanItems(a, b)
    );

  return {
    incidentId: incident.id,
    availableContext,
    unresolvedCandidateIds,
    recommended,
    blockedByContext,
    stopCondition:
      recommended.length === 0 && blockedByContext.length === 0
        ? "candidate-set-not-discriminable"
        : "candidate-proven",
  };
}
