import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";

export interface DiagnosticProbeObservation {
  probeId: string;
  outcomeId: string;
}

export interface DiagnosticInvestigationState {
  incidentId: string;
  activeCandidateIds: readonly string[];
  rejectedCandidateIds: readonly string[];
  supportedCandidateIds: readonly string[];
  observations: readonly DiagnosticProbeObservation[];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function createDiagnosticInvestigation(
  incident: CausalIncident,
): DiagnosticInvestigationState {
  return {
    incidentId: incident.id,
    activeCandidateIds: incident.rootCauseCandidates.map((item) => item.id).sort(),
    rejectedCandidateIds: [],
    supportedCandidateIds: [],
    observations: [],
  };
}

export function applyDiagnosticProbeObservation(
  state: DiagnosticInvestigationState,
  probes: readonly DiagnosticProbeDefinition[],
  observation: DiagnosticProbeObservation,
): DiagnosticInvestigationState {
  const probe = probes.find((item) => item.id === observation.probeId);
  if (!probe) throw new Error("Unknown diagnostic probe: " + observation.probeId);
  const outcome = probe.outcomes.find((item) => item.id === observation.outcomeId);
  if (!outcome) {
    throw new Error(
      "Unknown outcome " + observation.outcomeId + " for probe " + observation.probeId,
    );
  }

  const rejected = new Set([
    ...state.rejectedCandidateIds,
    ...(outcome.rejectsCandidateIds ?? []),
  ]);
  const supported = new Set([
    ...state.supportedCandidateIds,
    ...(outcome.supportsCandidateIds ?? []),
  ]);
  for (const id of rejected) supported.delete(id);

  const active = state.activeCandidateIds.filter((id) => !rejected.has(id));

  return {
    incidentId: state.incidentId,
    activeCandidateIds: unique(active),
    rejectedCandidateIds: unique([...rejected]),
    supportedCandidateIds: unique([...supported].filter((id) => active.includes(id))),
    observations: [...state.observations, observation],
  };
}

export function investigationIncident(
  incident: CausalIncident,
  state: DiagnosticInvestigationState,
): CausalIncident {
  if (incident.id !== state.incidentId) {
    throw new Error("Investigation incident mismatch.");
  }
  const active = new Set(state.activeCandidateIds);
  const supported = new Set(state.supportedCandidateIds);
  return {
    ...incident,
    rootCauseCandidates: incident.rootCauseCandidates
      .filter((candidate) => active.has(candidate.id))
      .sort((a, b) =>
        Number(supported.has(b.id)) - Number(supported.has(a.id)) ||
        a.id.localeCompare(b.id)
      ),
  };
}
