import type {
  DiagnosticProbeCandidate,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  DiagnosticProbeDefinition,
  RuntimeProbeBinding,
} from "../../../project-model/src/index.js";

export function deriveCrossDomainProbeCandidates(
  hypothesisId: string,
  definitions: readonly DiagnosticProbeDefinition[],
  bindings: readonly RuntimeProbeBinding[],
): DiagnosticProbeCandidate[] {
  const bindingByProbeId = new Map(
    bindings.map((binding) => [binding.probeId, binding] as const),
  );
  return definitions.flatMap((definition) => {
    const binding = bindingByProbeId.get(definition.id);
    if (!binding) return [];
    const presentOutcome =
      definition.outcomes.find((item) =>
        item.id === binding.outcomeByState.present
      );
    const absentOutcome =
      definition.outcomes.find((item) =>
        item.id === binding.outcomeByState.absent
      );
    const stateFor = (
      outcome: typeof presentOutcome,
    ): "present" | "absent" =>
      outcome?.supportsCandidateIds?.includes(hypothesisId)
        ? "present"
        : "absent";
    return [{
      id: definition.id,
      predicate: binding.predicate,
      cost: definition.costUnits,
      risk:
        definition.mutationRisk === "read-only"
          ? 0
          : definition.mutationRisk === "guarded"
            ? 1
            : 3,
      predictions: [
        { hypothesisId, state: stateFor(presentOutcome) },
        { hypothesisId, state: stateFor(absentOutcome) },
      ],
    }];
  }).sort((a, b) => a.id.localeCompare(b.id));
}
