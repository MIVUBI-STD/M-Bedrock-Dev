import type {
  DiagnosticRepairDecision,
  RuntimeEvidenceIntegrityReport,
} from "../../project-model/src/index.js";
import type {
  RuntimeIntentDiagnosticReclassification,
} from "./runtime-intent-diagnostic-reclassification.js";

export type ReclassifiedRepairEntryDisposition =
  | "admit"
  | "guarded-admit"
  | "proposal-only"
  | "blocked";

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
): ReclassifiedRepairEntryDecision {
  const base = {
    diagnosticDisposition:
      reclassification.disposition,
    repairDisposition:
      diagnostic.disposition,
  } as const;

  if (reclassification.disposition === "probable-defect") {
    return {
      ...base,
      disposition: "proposal-only",
      reasons: [
        "Runtime evidence supports a probable defect, but intent is inferred rather than authored.",
        "Mutation is withheld until the intent contract is strong enough for confirmation.",
      ],
    };
  }

  if (
    reclassification.disposition !== "confirmed-defect"
  ) {
    return {
      ...base,
      disposition: "blocked",
      reasons: [
        "Automatic mutation requires confirmed-defect classification.",
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
        "Causal diagnostic decision has not reached a mutation-eligible state.",
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
    diagnostic.disposition ===
      "guarded-repair-eligible"
  ) {
    return {
      ...base,
      disposition: "guarded-admit",
      reasons: [
        "Confirmed defect and runtime integrity permit only a guarded working-copy repair experiment.",
        ...diagnostic.reasons,
      ],
    };
  }

  return {
    ...base,
    disposition: "admit",
    reasons: [
      "Confirmed defect, causal diagnostic authorization, and runtime evidence integrity permit entry into the repair admission pipeline.",
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
