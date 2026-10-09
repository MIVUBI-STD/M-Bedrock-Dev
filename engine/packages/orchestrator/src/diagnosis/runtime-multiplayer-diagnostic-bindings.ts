import type {
  RuntimeDiagnosticPredicateBindings,
} from "../diagnosis/runtime-intent-diagnostic-reclassification.js";

function interventionBackedTreatmentViolation(
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

function observedTreatmentViolation(
  predicate: string,
): RuntimeDiagnosticPredicateBindings {
  return {
    contradictionRolePredicates: [{
      predicate,
      role: "treatment",
      state: "present",
    }],
    runtimeProofRolePredicates: [{
      predicate,
      role: "treatment",
      state: "present",
    }],
  };
}

export const MULTIPLAYER_STALE_JOIN_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedTreatmentViolation(
      "stale-join-transition-observed",
    );

export const MULTIPLAYER_RECONNECT_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedTreatmentViolation(
      "stale-session-mutation-observed",
    );

export const MULTIPLAYER_STALE_LIFE_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedTreatmentViolation(
      "stale-life-join-mutation-observed",
    );

export const MULTIPLAYER_CAPACITY_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedTreatmentViolation(
      "arena-capacity-overflow-observed",
    );

export const MULTIPLAYER_START_OWNERSHIP_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    interventionBackedTreatmentViolation(
      "arena-start-ownership-violation-observed",
    );

export const MULTIPLAYER_FULL_CAPACITY_DIAGNOSTIC_BINDINGS:
  RuntimeDiagnosticPredicateBindings =
    observedTreatmentViolation(
      "arena-session-invariant-violation-observed",
    );
