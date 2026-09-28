import {
  gateIntentDiagnostic,
  type IntentDiagnosticDisposition,
  type IntentDiagnosticGateResult,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type {
  RuntimeEvidenceIntegrityReport,
} from "../../project-model/src/index.js";
import type {
  RuntimeExperimentDiagnosticBridge,
  RuntimeDiagnosticPredicateEvidence,
} from "./runtime-experiment-diagnostic-evidence.js";

export interface RuntimeDiagnosticPredicateBindings {
  contradictionPredicates?: readonly string[];
  designMatchPredicates?: readonly string[];
  engineConstraintPredicates?: readonly string[];
  compatibilityDifferencePredicates?: readonly string[];
  runtimeProofPredicates?: readonly string[];
}

export interface RuntimeIntentDiagnosticReclassificationInput {
  intent: GameplayIntentModel;
  subjectIds: readonly string[];
  bridge: RuntimeExperimentDiagnosticBridge;
  bindings: RuntimeDiagnosticPredicateBindings;
  runtimeProofRequired?: boolean;
  runtimeIntegrity?: RuntimeEvidenceIntegrityReport;
  previousDisposition?: IntentDiagnosticDisposition;
}

export interface RuntimeIntentDiagnosticReclassification {
  previousDisposition?: IntentDiagnosticDisposition;
  disposition: IntentDiagnosticDisposition;
  changed: boolean;
  gate: IntentDiagnosticGateResult;
  matchedPredicates: {
    contradictions: readonly string[];
    designMatches: readonly string[];
    engineConstraints: readonly string[];
    compatibilityDifferences: readonly string[];
    runtimeProof: readonly string[];
  };
}

function byPredicate(
  bridge: RuntimeExperimentDiagnosticBridge,
): ReadonlyMap<string, RuntimeDiagnosticPredicateEvidence> {
  return new Map(
    bridge.predicates.map((item) => [
      item.predicate,
      item,
    ]),
  );
}

function presentEvidenceIds(
  predicates: readonly string[] | undefined,
  evidence: ReadonlyMap<
    string,
    RuntimeDiagnosticPredicateEvidence
  >,
): {
  predicates: string[];
  evidenceIds: string[];
} {
  const matchedPredicates: string[] = [];
  const evidenceIds: string[] = [];

  for (const predicate of predicates ?? []) {
    const item = evidence.get(predicate);
    if (
      !item ||
      item.observation.state !== "present" ||
      item.ceiling === "unknown"
    ) {
      continue;
    }

    matchedPredicates.push(predicate);
    evidenceIds.push(...item.sourceEvidenceIds);
  }

  return {
    predicates: [...new Set(matchedPredicates)].sort(),
    evidenceIds: [...new Set(evidenceIds)].sort(),
  };
}

function runtimeProofEvidenceIds(
  predicates: readonly string[] | undefined,
  evidence: ReadonlyMap<
    string,
    RuntimeDiagnosticPredicateEvidence
  >,
): {
  predicates: string[];
  evidenceIds: string[];
} {
  const matchedPredicates: string[] = [];
  const evidenceIds: string[] = [];

  for (const predicate of predicates ?? []) {
    const item = evidence.get(predicate);
    if (
      !item ||
      item.observation.state === "unknown" ||
      item.ceiling === "unknown"
    ) {
      continue;
    }

    matchedPredicates.push(predicate);
    evidenceIds.push(...item.sourceEvidenceIds);
  }

  return {
    predicates: [...new Set(matchedPredicates)].sort(),
    evidenceIds: [...new Set(evidenceIds)].sort(),
  };
}

function allObservedEvidenceIds(
  bridge: RuntimeExperimentDiagnosticBridge,
): string[] {
  return [
    ...new Set(
      bridge.predicates
        .filter(
          (item) =>
            item.observation.state !== "unknown" &&
            item.ceiling !== "unknown",
        )
        .flatMap((item) => item.sourceEvidenceIds),
    ),
  ].sort();
}

export function reclassifyIntentDiagnosticFromRuntime(
  input: RuntimeIntentDiagnosticReclassificationInput,
): RuntimeIntentDiagnosticReclassification {
  const evidence = byPredicate(input.bridge);

  const contradictions = presentEvidenceIds(
    input.bindings.contradictionPredicates,
    evidence,
  );
  const designMatches = presentEvidenceIds(
    input.bindings.designMatchPredicates,
    evidence,
  );
  const engineConstraints = presentEvidenceIds(
    input.bindings.engineConstraintPredicates,
    evidence,
  );
  const compatibilityDifferences = presentEvidenceIds(
    input.bindings.compatibilityDifferencePredicates,
    evidence,
  );
  const runtimeProof = runtimeProofEvidenceIds(
    input.bindings.runtimeProofPredicates,
    evidence,
  );

  const gate = gateIntentDiagnostic({
    intent: input.intent,
    subjectIds: input.subjectIds,
    observationEvidenceIds:
      allObservedEvidenceIds(input.bridge),
    contradictionEvidenceIds:
      contradictions.evidenceIds,
    designMatchEvidenceIds:
      designMatches.evidenceIds,
    engineConstraintEvidenceIds:
      engineConstraints.evidenceIds,
    compatibilityDifferenceEvidenceIds:
      compatibilityDifferences.evidenceIds,
    ...(input.runtimeProofRequired === undefined
      ? {}
      : {
          runtimeProofRequired:
            input.runtimeProofRequired,
        }),
    runtimeProofEvidenceIds:
      runtimeProof.evidenceIds,
    ...(input.runtimeProofRequired === true
      ? {
          runtimeEvidenceIntegritySatisfied:
            input.runtimeIntegrity?.safeForCurrentStateClaims === true,
        }
      : {}),
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
    matchedPredicates: {
      contradictions: contradictions.predicates,
      designMatches: designMatches.predicates,
      engineConstraints: engineConstraints.predicates,
      compatibilityDifferences:
        compatibilityDifferences.predicates,
      runtimeProof: runtimeProof.predicates,
    },
  };
}
