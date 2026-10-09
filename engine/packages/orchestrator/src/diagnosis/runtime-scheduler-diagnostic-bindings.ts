import type {
  RuntimeDiagnosticPredicateBindings,
} from "../diagnosis/runtime-intent-diagnostic-reclassification.js";

function interventionBackedContradiction(
  predicate: string,
): RuntimeDiagnosticPredicateBindings {
  return {
    contradictionRolePredicates: [{
      predicate,
      role: "treatment",
      state: "present",
      requireInterventionContrast: true,
      requireExpectedContrast: true,
    }],
    runtimeProofRolePredicates: [{
      predicate,
      role: "treatment",
      state: "present",
      requireInterventionContrast: true,
      requireExpectedContrast: true,
    }],
  };
}

export const SCHEDULER_CANCELLATION_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedContradiction(
      "cancelled-callback-mutation-observed",
    );

export const SCHEDULER_CROSS_ARENA_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedContradiction(
      "cross-arena-mutation-observed",
    );
