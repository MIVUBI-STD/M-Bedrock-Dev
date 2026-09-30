import {
  gateIntentDiagnostic,
  type IntentDiagnosticDisposition,
  type IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import {
  runtimeProfileDifferentialEvidence,
  type RuntimeProfileDifferentialReport,
} from "./runtime-profile-differential.js";

export interface RuntimeProfileDifferentialReclassificationInput {
  intent: GameplayIntentModel;
  subjectIds: readonly string[];
  report: RuntimeProfileDifferentialReport;
  previousDisposition?: IntentDiagnosticDisposition;
}

export interface RuntimeProfileDifferentialReclassification {
  previousDisposition?: IntentDiagnosticDisposition;
  disposition: IntentDiagnosticDisposition;
  changed: boolean;
  gate: IntentDiagnosticGateResult;
  matchedCompatibilityPredicates: readonly string[];
}

export function reclassifyIntentDiagnosticFromProfileDifferential(
  input: RuntimeProfileDifferentialReclassificationInput,
): RuntimeProfileDifferentialReclassification {
  const evidence =
    runtimeProfileDifferentialEvidence(input.report);

  const divergent = input.report.comparisons.filter(
    (comparison) =>
      comparison.disposition === "divergent",
  );
  const divergentPredicates = divergent.map(
    (comparison) =>
      "runtime-profile-divergence:" +
      comparison.key,
  );
  const compatibilityEvidenceIds = divergent.flatMap(
    (comparison) =>
      comparison.states.flatMap(
        (state) => state.evidenceIds,
      ),
  );

  const gate = gateIntentDiagnostic({
    intent: input.intent,
    subjectIds: input.subjectIds,
    observationEvidenceIds:
      input.report.disposition === "insufficient"
        ? []
        : evidence.evidenceIds,
    contradictionEvidenceIds: [],
    designMatchEvidenceIds: [],
    engineConstraintEvidenceIds: [],
    compatibilityDifferenceEvidenceIds: [
      ...new Set(compatibilityEvidenceIds),
    ].sort(),
    runtimeProofRequired: false,
    runtimeProofEvidenceIds: [],
  });

  return {
    ...(input.previousDisposition === undefined
      ? {}
      : {
          previousDisposition:
            input.previousDisposition,
        }),
    disposition: gate.disposition,
    changed:
      input.previousDisposition !== undefined &&
      input.previousDisposition !== gate.disposition,
    gate,
    matchedCompatibilityPredicates:
      divergentPredicates.sort(),
  };
}
