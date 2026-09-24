import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";
import type { RuntimeProbeRequest, RuntimeProbeResponse } from "../../project-model/src/runtime-probe.js";
import { runtimeScopeContains } from "../../project-model/src/runtime-evidence.js";
import { parseRuntimeProbeResponse } from "../../project-model/src/runtime-probe-validate.js";
import type { DiagnosticInvestigationState } from "./diagnostic-investigation.js";
import { applyDiagnosticProbeObservation } from "./diagnostic-investigation.js";

export interface AppliedRuntimeProbeResult {
  response: RuntimeProbeResponse;
  investigation: DiagnosticInvestigationState;
}

export function applyRuntimeProbeResponse(
  state: DiagnosticInvestigationState,
  probes: readonly DiagnosticProbeDefinition[],
  issuedRequest: RuntimeProbeRequest,
  input: unknown,
): AppliedRuntimeProbeResult {
  const response = parseRuntimeProbeResponse(input);
  const probe = probes.find((item) => item.id === response.probeId);

  if (!probe) {
    throw new Error("Runtime probe response references unknown probe: " + response.probeId);
  }

  if (response.requestId !== issuedRequest.requestId) {
    throw new Error(
      "Runtime probe response requestId does not match issued request: " +
        response.requestId +
        " vs " +
        issuedRequest.requestId,
    );
  }

  if (
    response.probeId !== issuedRequest.probeId ||
    issuedRequest.probeId !== probe.id
  ) {
    throw new Error(
      "Runtime probe response does not match issued probe: " +
        response.probeId +
        " vs " +
        issuedRequest.probeId,
    );
  }

  if (response.evidence.predicate !== issuedRequest.predicate) {
    throw new Error(
      "Runtime probe response predicate does not match issued request.",
    );
  }

  if (
    issuedRequest.runtimeTick !== undefined &&
    response.runtimeTick < issuedRequest.runtimeTick
  ) {
    throw new Error(
      "Runtime probe response runtimeTick predates issued request.",
    );
  }

  if (
    !runtimeScopeContains(
      response.evidence.scope,
      issuedRequest.scope,
    )
  ) {
    throw new Error(
      "Runtime probe response evidence scope does not match issued request scope.",
    );
  }

  const expectedOutcomeId =
    issuedRequest.outcomeByState[response.state];
  if (!expectedOutcomeId) {
    throw new Error(
      "Runtime probe state has no explicit bound outcome; investigation state is unchanged.",
    );
  }

  if (!response.outcomeId) {
    throw new Error(
      "Runtime probe response has no explicit outcomeId; investigation state is unchanged.",
    );
  }

  if (response.outcomeId !== expectedOutcomeId) {
    throw new Error(
      "Runtime probe response outcome does not match bound state mapping: " +
        response.state +
        " -> " +
        expectedOutcomeId +
        ", received " +
        response.outcomeId +
        ".",
    );
  }

  if (!probe.outcomes.some((item) => item.id === response.outcomeId)) {
    throw new Error(
      "Runtime probe response outcome does not belong to probe " +
        response.probeId +
        ": " +
        response.outcomeId,
    );
  }

  return {
    response,
    investigation: applyDiagnosticProbeObservation(
      state,
      probes,
      {
        probeId: response.probeId,
        outcomeId: response.outcomeId,
      },
    ),
  };
}
