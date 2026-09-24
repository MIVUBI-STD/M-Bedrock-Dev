import type { CausalIncident } from "../../project-model/src/causal-chain.js";
import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";
import type {
  RuntimeProbeRequest,
  RuntimeProbeResponse,
} from "../../project-model/src/runtime-probe.js";
import type { RuntimeEvidenceRecord } from "../../project-model/src/runtime-evidence.js";
import {
  parseRuntimeProbeRequest,
  parseRuntimeProbeResponse,
} from "../../project-model/src/runtime-probe-validate.js";
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
  maxConsumedRequestIds?: number;
  maxEvidenceRecords?: number;
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
  readonly droppedEvidenceRecords: number;
  register(request: RuntimeProbeRequest): void;
  apply(input: unknown): AppliedRuntimeProbeSessionResult;
  discard(requestId: string): boolean;
  pending(): readonly RuntimeProbeRequest[];
  evidence(): readonly RuntimeEvidenceRecord[];
  incident(): CausalIncident;
  expire(currentRuntimeTick: number): readonly RuntimeProbeRequest[];
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

function validatePositiveBudget(
  value: number | undefined,
  label: string,
): void {
  if (
    value !== undefined &&
    (!Number.isInteger(value) || value < 1)
  ) {
    throw new Error(label + " must be a positive integer.");
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
  validatePositiveBudget(
    options.maxConsumedRequestIds,
    "maxConsumedRequestIds",
  );
  validatePositiveBudget(
    options.maxEvidenceRecords,
    "maxEvidenceRecords",
  );

  const probeIds = new Set<string>();
  for (const probe of options.probes) {
    if (probeIds.has(probe.id)) {
      throw new Error(
        "Duplicate diagnostic probe id: " + probe.id,
      );
    }
    probeIds.add(probe.id);
  }

  const maxConsumedRequestIds =
    options.maxConsumedRequestIds ?? 1024;
  const maxEvidenceRecords =
    options.maxEvidenceRecords ?? 1024;
  const pending = new Map<string, RuntimeProbeRequest>();
  const consumed = new Set<string>();
  const consumedOrder: string[] = [];
  const evidenceRecords: RuntimeEvidenceRecord[] = [];
  let droppedEvidenceRecords = 0;
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

    get droppedEvidenceRecords() {
      return droppedEvidenceRecords;
    },

    register(request) {
      const parsed = parseRuntimeProbeRequest(request);
      if (!probeIds.has(parsed.probeId)) {
        throw new Error(
          "Runtime probe request references unknown diagnostic probe: " +
            parsed.probeId,
        );
      }
      if (pending.has(parsed.requestId) || consumed.has(parsed.requestId)) {
        throw new Error(
          "Duplicate runtime probe requestId: " + parsed.requestId,
        );
      }
      pending.set(parsed.requestId, parsed);
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
      consumedOrder.push(response.requestId);
      while (consumedOrder.length > maxConsumedRequestIds) {
        const oldest = consumedOrder.shift();
        if (oldest !== undefined) consumed.delete(oldest);
      }

      evidenceRecords.push(evidence);
      if (evidenceRecords.length > maxEvidenceRecords) {
        const overflow =
          evidenceRecords.length - maxEvidenceRecords;
        evidenceRecords.splice(0, overflow);
        droppedEvidenceRecords += overflow;
      }

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

    expire(currentRuntimeTick) {
      if (
        !Number.isInteger(currentRuntimeTick) ||
        currentRuntimeTick < 0
      ) {
        throw new Error(
          "currentRuntimeTick must be a non-negative integer.",
        );
      }
      if (options.maxResponseTickDelta === undefined) return [];

      const expired: RuntimeProbeRequest[] = [];
      for (const [requestId, request] of pending) {
        if (
          request.runtimeTick !== undefined &&
          currentRuntimeTick - request.runtimeTick >
            options.maxResponseTickDelta
        ) {
          pending.delete(requestId);
          expired.push(request);
        }
      }
      return expired.sort(
        (a, b) => a.requestId.localeCompare(b.requestId),
      );
    },

    clearPending() {
      pending.clear();
    },
  };
}
