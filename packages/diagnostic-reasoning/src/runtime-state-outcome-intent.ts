import {
  resolveRuntimeStateSnapshot,
  type RuntimeStateSnapshot,
} from "../../project-model/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import {
  gateObservedOutcomeAgainstIntent,
  type ObservedOutcomeIntentInput,
} from "./observed-outcome-intent.js";
import type {
  IntentDiagnosticGateResult,
} from "./intent-gate.js";

export interface RuntimeStateOutcomeIntentInput {
  intent: GameplayIntentModel;
  outcomeId: string;
  stateSnapshot: RuntimeStateSnapshot;
  observationEvidenceIds: readonly string[];
}

export function gateRuntimeStateOutcomeAgainstIntent(
  input: RuntimeStateOutcomeIntentInput,
): IntentDiagnosticGateResult {
  const resolution = resolveRuntimeStateSnapshot(
    input.stateSnapshot,
  );

  if (resolution.conflicts.length > 0) {
    return {
      disposition: "insufficient-evidence",
      subjectIds: [input.outcomeId],
      basisInvariantIds: [],
      evidenceIds: [
        ...new Set([
          ...input.observationEvidenceIds,
          ...resolution.evidenceIds,
        ]),
      ].sort(),
      reasons: resolution.conflicts.map(
        (conflict) =>
          "Conflicting runtime state observations for " +
          conflict.path +
          ": " +
          conflict.values.map(String).join(", "),
      ),
    };
  }

  const request: ObservedOutcomeIntentInput = {
    intent: input.intent,
    outcomeId: input.outcomeId,
    stateValues: resolution.values,
    observationEvidenceIds: [
      ...new Set([
        ...input.observationEvidenceIds,
        ...resolution.evidenceIds,
      ]),
    ].sort(),
  };

  return gateObservedOutcomeAgainstIntent(request);
}
