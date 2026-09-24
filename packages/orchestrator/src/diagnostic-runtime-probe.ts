import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";
import type { RuntimeProbeRequest, RuntimeProbeResponse } from "../../project-model/src/runtime-probe.js";
import { parseRuntimeProbeExchange } from "../../project-model/src/runtime-probe-validate.js";
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
  const { response } = parseRuntimeProbeExchange(
    issuedRequest,
    input,
  );
  const probe = probes.find((item) => item.id === response.probeId);

  if (!probe) {
    throw new Error("Runtime probe response references unknown probe: " + response.probeId);
  }

  if (!response.ok) {
    throw new Error(
      "Runtime probe execution failed; investigation state is unchanged: " +
        (response.error ?? "unknown runtime probe error"),
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
