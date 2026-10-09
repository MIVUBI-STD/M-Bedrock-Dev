import type {
  DiagnosticRepairDecision,
  RuntimeEvidenceIntegrityReport,
} from "../../../project-model/src/index.js";
import type {
  RuntimeIntentDiagnosticReclassification,
} from "../diagnosis/runtime-intent-diagnostic-reclassification.js";

export type ReclassifiedRepairEntryDisposition =
  | "admit"
  | "guarded-admit"
  | "blocked";

export interface ReclassifiedRepairWorkflowAuthority {
  readonly approvedBug: boolean;
  readonly preservationContractReady: boolean;
}

export interface ReclassifiedRepairEntryDecision {
  disposition: ReclassifiedRepairEntryDisposition;
  diagnosticDisposition:
    RuntimeIntentDiagnosticReclassification["disposition"];
  repairDisposition:
    DiagnosticRepairDecision["disposition"];
  reasons: readonly string[];
}

export function decideReclassifiedRepairEntry(
  reclassification: RuntimeIntentDiagnosticReclassification,
  diagnostic: DiagnosticRepairDecision,
  integrity?: RuntimeEvidenceIntegrityReport,
  workflowAuthority?: ReclassifiedRepairWorkflowAuthority,
): ReclassifiedRepairEntryDecision {
  const base = {
    diagnosticDisposition:
      reclassification.disposition,
    repairDisposition:
      diagnostic.disposition,
  } as const;

  if (
    reclassification.disposition !== "confirmed-defect"
  ) {
    return {
      ...base,
      disposition: "blocked",
      reasons: [
        "Repair entry first requires confirmed-defect evidence.",
        "Current classification: " +
          reclassification.disposition +
          ".",
      ],
    };
  }

  if (
    diagnostic.disposition !== "repair-eligible" &&
    diagnostic.disposition !==
      "guarded-repair-eligible"
  ) {
    return {
      ...base,
      disposition: "blocked",
      reasons: [
        "Confirmed defect is not sufficient by itself to authorize mutation.",
        "Causal diagnosis has not reached internal repair-candidate readiness.",
        ...diagnostic.reasons,
      ],
    };
  }

  if (!integrity) {
    return {
      ...base,
      disposition: "blocked",
      reasons: [
        "Confirmed runtime-backed repair entry requires an explicit runtime evidence integrity report.",
      ],
    };
  }

  if (!integrity.safeForCurrentStateClaims) {
    return {
      ...base,
      disposition: "blocked",
      reasons: [
        "Runtime evidence integrity is insufficient for current-state mutation claims.",
        ...integrity.reasons,
      ],
    };
  }

  if (!integrity.safeForTemporalViolationClaims) {
    return {
      ...base,
      disposition: "blocked",
      reasons: [
        "Runtime evidence is not temporally complete enough for automatic repair admission.",
        ...integrity.reasons,
      ],
    };
  }

  if (
    workflowAuthority?.approvedBug !== true ||
    workflowAuthority.preservationContractReady !== true
  ) {
    return {
      ...base,
      disposition: "blocked",
      reasons: [
        "Approved Bug and Repair Contract are required before repair entry.",
      ],
    };
  }

  if (
    diagnostic.disposition ===
      "guarded-repair-eligible"
  ) {
    return {
      ...base,
      disposition: "guarded-admit",
      reasons: [
        "Evidence is sufficient for guarded repair entry; Approved Bug and Repair Contract remain the mutation authority.",
        ...diagnostic.reasons,
      ],
    };
  }

  return {
    ...base,
    disposition: "admit",
    reasons: [
      "Evidence is sufficient to enter repair admission; Approved Bug and Repair Contract remain the mutation authority.",
      ...diagnostic.reasons,
    ],
  };
}

export function assertReclassifiedRepairEntry(
  decision: ReclassifiedRepairEntryDecision,
): void {
  if (
    decision.disposition === "admit" ||
    decision.disposition === "guarded-admit"
  ) {
    return;
  }

  throw new Error(
    "Repair entry blocked: " +
      decision.disposition +
      " - " +
      decision.reasons.join("; "),
  );
}
