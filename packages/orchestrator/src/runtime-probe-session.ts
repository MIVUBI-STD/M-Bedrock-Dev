import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";
import type {
  RuntimeProbeRequest,
  RuntimeProbeResponse,
} from "../../project-model/src/runtime-probe.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import { parseRuntimeProbeResponse } from "../../project-model/src/runtime-probe-validate.js";
import {
  createDiagnosticInvestigation,
  investigationIncident,
  type DiagnosticInvestigationState,
} from "./diagnostic-investigation.js";
import {
  applyRuntimeProbeResponse,
  type AppliedRuntimeProbeResult,
} from "./diagnostic-runtime-probe.js";

export interface RuntimeProbeInvestigationSessionOptions {
  incident: CausalIncident;
  probes: readonly DiagnosticProbeDefinition[];
  maxResponseTickDelta?: number;
}

export interface AppliedRuntimeProbeSessionResult
  extends AppliedRuntimeProbeResult {
  evidence: RuntimeEvidenceRecord;
  pendingRequests: number;
}

export interface RuntimeProbeInvestigationSession {
  readonly investigation: DiagnosticInvestigationState;
  readonly pendingRequests: number;
  readonly consumedRequests: number;
  register(request: RuntimeProbeRequest): void;
  apply(input: unknown): AppliedRuntimeProbeSessionResult;
  discard(requestId: string): boolean;
  pending(): readonly RuntimeProbeRequest[];
  evidence(): readonly RuntimeEvidenceRecord[];
  incident(): CausalIncident;
  clearPending(): void;
}

function validateMaxTickDelta(value: number | undefined): void {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || value < 0)
  ) {
    throw new Error(
      "maxResponseTickDelta must be a non-negative integer.",
    );
  }
}

function enrichedEvidence(
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

export function createRuntimeProbeInvestigationSession(
  options: RuntimeProbeInvestigationSessionOptions,
): RuntimeProbeInvestigationSession {
  validateMaxTickDelta(options.maxResponseTickDelta);

  const probeIds = new Set(options.probes.map((probe) => probe.id));
  const pending = new Map<string, RuntimeProbeRequest>();
  const consumed = new Set<string>();
  const evidenceRecords: RuntimeEvidenceRecord[] = [];
  let investigation = createDiagnosticInvestigation(options.incident);

  return {
    get investigation() {
      return investigation;
    },

    get pendingRequests() {
      return pending.size;
    },

    get consumedRequests() {
      return consumed.size;
    },

    register(request) {
      if (!probeIds.has(request.probeId)) {
        throw new Error(
          "Runtime probe request references unknown diagnostic probe: " +
            request.probeId,
        );
      }
      if (pending.has(request.requestId) || consumed.has(request.requestId)) {
        throw new Error(
          "Duplicate runtime probe requestId: " + request.requestId,
        );
      }
      pending.set(request.requestId, request);
    },

    apply(input) {
      const response = parseRuntimeProbeResponse(input);

      if (consumed.has(response.requestId)) {
        throw new Error(
          "Runtime probe response replay detected for requestId: " +
            response.requestId,
        );
      }

      const request = pending.get(response.requestId);
      if (!request) {
        throw new Error(
          "Runtime probe response has no outstanding request: " +
            response.requestId,
        );
      }

      if (
        options.maxResponseTickDelta !== undefined &&
        request.runtimeTick !== undefined &&
        response.runtimeTick - request.runtimeTick >
          options.maxResponseTickDelta
      ) {
        throw new Error(
          "Runtime probe response exceeded maxResponseTickDelta.",
        );
      }

      const result = applyRuntimeProbeResponse(
        investigation,
        options.probes,
        request,
        response,
      );

      const evidence = enrichedEvidence(result.response);
      investigation = result.investigation;
      pending.delete(response.requestId);
      consumed.add(response.requestId);
      evidenceRecords.push(evidence);

      return {
        ...result,
        evidence,
        pendingRequests: pending.size,
      };
    },

    discard(requestId) {
      return pending.delete(requestId);
    },

    pending() {
      return [...pending.values()].sort(
        (a, b) => a.requestId.localeCompare(b.requestId),
      );
    },

    evidence() {
      return evidenceRecords.map((record) => ({
        ...record,
        ...(record.scope === undefined
          ? {}
          : { scope: { ...record.scope } }),
        ...(record.relatedNodeIds === undefined
          ? {}
          : { relatedNodeIds: [...record.relatedNodeIds] }),
      }));
    },

    incident() {
      return investigationIncident(
        options.incident,
        investigation,
      );
    },

    clearPending() {
      pending.clear();
    },
  };
}
