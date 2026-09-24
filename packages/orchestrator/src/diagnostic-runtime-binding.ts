import type { DiagnosticProbeDefinition } from "../../project-model/src/diagnostic-probe.js";
import type { RuntimeProbeBinding } from "../../project-model/src/runtime-probe.js";

export interface BoundRuntimeDiagnosticProbe {
  probeId: string;
  predicate: string;
  query: RuntimeProbeBinding["query"];
  outcomeByState: RuntimeProbeBinding["outcomeByState"];
}

function outcomeIds(probe: DiagnosticProbeDefinition): ReadonlySet<string> {
  return new Set(probe.outcomes.map((outcome) => outcome.id));
}

export function bindDiagnosticProbeToRuntime(
  probe: DiagnosticProbeDefinition,
  binding: RuntimeProbeBinding,
): BoundRuntimeDiagnosticProbe {
  if (binding.probeId !== probe.id) {
    throw new Error(
      "Runtime probe binding targets " +
        binding.probeId +
        " but diagnostic probe is " +
        probe.id +
        ".",
    );
  }

  const allowed = outcomeIds(probe);
  for (const [state, outcomeId] of Object.entries(binding.outcomeByState)) {
    if (outcomeId === undefined) continue;
    if (!allowed.has(outcomeId)) {
      throw new Error(
        "Runtime probe binding maps " +
          state +
          " to undeclared outcome " +
          outcomeId +
          " for probe " +
          probe.id +
          ".",
      );
    }
  }

  return {
    probeId: probe.id,
    predicate: binding.predicate,
    query: binding.query,
    outcomeByState: binding.outcomeByState,
  };
}
