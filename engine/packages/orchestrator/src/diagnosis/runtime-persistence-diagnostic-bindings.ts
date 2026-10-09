import type {
  RuntimeDiagnosticPredicateBindings,
} from "../diagnosis/runtime-intent-diagnostic-reclassification.js";

function interventionBackedPersistenceViolation(
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

export const PERSISTENCE_TRANSIENT_RESTORE_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedPersistenceViolation(
      "stale-transient-state-restored-observed",
    );

export const PERSISTENCE_DUPLICATE_APPLY_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedPersistenceViolation(
      "duplicate-apply-after-reload-observed",
    );

export const PERSISTENCE_ORPHAN_RESOURCE_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedPersistenceViolation(
      "orphan-resource-retained-observed",
    );
