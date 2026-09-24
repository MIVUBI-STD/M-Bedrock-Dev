import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type {
  DiagnosticExecutionContext,
  DiagnosticProbeDefinition,
  DiagnosticProbePlan,
} from "../../project-model/src/diagnostic-probe.js";
import type {
  RuntimeProbeResponse,
  RuntimeProbeTranscript,
} from "../../project-model/src/runtime-probe.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import { parseRuntimeProbeTranscript } from "../../project-model/src/runtime-probe-validate.js";
import {
  createRuntimeProbeInvestigationSession,
  type RuntimeProbeInvestigationSessionOptions,
} from "./runtime-probe-session.js";
import { planDiagnosticProbes } from "./diagnostic-probe-planning.js";

export interface RuntimeProbeReplayFailure {
  requestId: string;
  probeId: string;
  error?: string;
}

export interface RuntimeProbeReplayResult {
  incident: CausalIncident;
  successfulProbeIds: readonly string[];
  failed: readonly RuntimeProbeReplayFailure[];
  evidence: readonly RuntimeEvidenceRecord[];
  nextPlan: DiagnosticProbePlan;
  transcriptIncomplete: boolean;
  droppedExchanges: number;
  ignoredIncidentExchanges: number;
}

export interface RuntimeProbeReplayOptions {
  availableContext: DiagnosticExecutionContext;
  allowUnscopedRequests?: boolean;
  maxResponseTickDelta?: number;
  maxConsumedRequestIds?: number;
  maxEvidenceRecords?: number;
}

function failedEvidence(
  response: RuntimeProbeResponse,
): RuntimeEvidenceRecord {
  return {
    ...response.evidence,
    relatedNodeIds: [
      ...new Set([
        ...(response.evidence.relatedNodeIds ?? []),
        "runtime-probe:" + response.requestId,
        "diagnostic-probe:" + response.probeId,
      ]),
    ],
    observedAt: {
      ...(response.evidence.observedAt ?? {}),
      tick: response.runtimeTick,
    },
  };
}

export function replayRuntimeProbeTranscript(
  incident: CausalIncident,
  probes: readonly DiagnosticProbeDefinition[],
  rawTranscript: RuntimeProbeTranscript,
  options: RuntimeProbeReplayOptions,
): RuntimeProbeReplayResult {
  const transcript = parseRuntimeProbeTranscript(rawTranscript);
  const sessionOptions: RuntimeProbeInvestigationSessionOptions = {
    incident,
    probes,
    ...(options.maxResponseTickDelta === undefined
      ? {}
      : { maxResponseTickDelta: options.maxResponseTickDelta }),
    ...(options.maxConsumedRequestIds === undefined
      ? {}
      : { maxConsumedRequestIds: options.maxConsumedRequestIds }),
    ...(options.maxEvidenceRecords === undefined
      ? {}
      : { maxEvidenceRecords: options.maxEvidenceRecords }),
  };
  const session = createRuntimeProbeInvestigationSession(
    sessionOptions,
  );

  const successfulProbeIds = new Set<string>();
  const failed: RuntimeProbeReplayFailure[] = [];
  const failedEvidenceRecords: RuntimeEvidenceRecord[] = [];
  let ignoredIncidentExchanges = 0;

  for (const exchange of transcript.exchanges) {
    if (
      (
        exchange.request.incidentId === undefined &&
        options.allowUnscopedRequests !== true
      ) ||
      (
        exchange.request.incidentId !== undefined &&
        exchange.request.incidentId !== incident.id
      )
    ) {
      ignoredIncidentExchanges += 1;
      continue;
    }
    session.register(exchange.request);

    if (!exchange.response.ok) {
      session.discard(exchange.request.requestId);
      failed.push({
        requestId: exchange.request.requestId,
        probeId: exchange.request.probeId,
        ...(exchange.response.error === undefined
          ? {}
          : { error: exchange.response.error }),
      });
      failedEvidenceRecords.push(
        failedEvidence(exchange.response),
      );
      continue;
    }

    session.apply(exchange.response);
    successfulProbeIds.add(exchange.request.probeId);
  }

  const updatedIncident = session.incident();
  const remainingProbes = probes.filter(
    (probe) => !successfulProbeIds.has(probe.id),
  );
  const nextPlan = planDiagnosticProbes(
    updatedIncident,
    remainingProbes,
    options.availableContext,
  );

  return {
    incident: updatedIncident,
    successfulProbeIds: [...successfulProbeIds].sort(),
    failed,
    evidence: [
      ...session.evidence(),
      ...failedEvidenceRecords,
    ],
    nextPlan,
    transcriptIncomplete:
      (transcript.droppedExchanges ?? 0) > 0 ||
      session.droppedEvidenceRecords > 0,
    droppedExchanges:
      (transcript.droppedExchanges ?? 0) +
      session.droppedEvidenceRecords,
    ignoredIncidentExchanges,
  };
}
