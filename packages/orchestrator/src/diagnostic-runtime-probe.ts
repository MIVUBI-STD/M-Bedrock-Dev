import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";
import type { RuntimeProbeBinding, RuntimeProbeResponse } from "../../project-model/src/runtime-probe.js";
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
  binding: RuntimeProbeBinding,
  input: unknown,
): AppliedRuntimeProbeResult {
  const response = parseRuntimeProbeResponse(input);
  const probe = probes.find((item) => item.id === response.probeId);

  if (!probe) {
    throw new Error("Runtime probe response references unknown probe: " + response.probeId);
  }

  if (binding.probeId !== response.probeId) {
    throw new Error(
      "Runtime probe response does not match binding probe: " +
        response.probeId +
        " vs " +
        binding.probeId,
    );
  }

  const expectedOutcomeId = binding.outcomeByState[response.state];
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
