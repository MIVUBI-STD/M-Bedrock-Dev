import type {
  PropertyEvaluation,
} from "../../behavior-model/src/index.js";
import type {
  DiagnosticEvidenceObservation,
} from "./types.js";

export interface BehaviorPropertyEvidenceBinding {
  propertyId: string;
  violationPredicate: string;
  satisfactionPredicate?: string;
}

export interface BehaviorPropertyEvidenceResult {
  observations: readonly DiagnosticEvidenceObservation[];
  unmappedPropertyIds: readonly string[];
}

export function diagnosticEvidenceFromBehaviorProperties(
  evaluations: readonly PropertyEvaluation[],
  bindings: readonly BehaviorPropertyEvidenceBinding[],
): BehaviorPropertyEvidenceResult {
  const byProperty = new Map(
    bindings.map((binding) => [
      binding.propertyId,
      binding,
    ]),
  );

  const observations: DiagnosticEvidenceObservation[] = [];
  const unmapped = new Set<string>();

  for (const evaluation of evaluations) {
    const binding = byProperty.get(
      evaluation.propertyId,
    );
    if (!binding) {
      unmapped.add(evaluation.propertyId);
      continue;
    }

    observations.push({
      predicate:
        binding.violationPredicate,
      state:
        evaluation.disposition === "violated"
          ? "present"
          : evaluation.disposition ===
              "satisfied"
            ? "absent"
            : "unknown",
      evidenceId:
        "behavior-property:" +
        evaluation.propertyId +
        ":" +
        evaluation.disposition,
    });

    if (binding.satisfactionPredicate) {
      observations.push({
        predicate:
          binding.satisfactionPredicate,
        state:
          evaluation.disposition ===
            "satisfied"
            ? "present"
            : evaluation.disposition ===
                "violated"
              ? "absent"
              : "unknown",
        evidenceId:
          "behavior-property:" +
          evaluation.propertyId +
          ":" +
          evaluation.disposition,
      });
    }
  }

  return {
    observations,
    unmappedPropertyIds: [
      ...unmapped,
    ].sort(),
  };
}
