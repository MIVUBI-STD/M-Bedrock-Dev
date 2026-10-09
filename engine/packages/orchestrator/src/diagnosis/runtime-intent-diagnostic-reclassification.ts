import {
  gateIntentDiagnostic,
  type IntentDiagnosticDisposition,
  type IntentDiagnosticGateResult,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  GameplayIntentModel,
} from "../../../gameplay-intent/src/index.js";
import type {
  RuntimeEvidenceIntegrityReport,
} from "../../../project-model/src/index.js";
import type {
  RuntimeExperimentDiagnosticBridge,
  RuntimeDiagnosticPredicateEvidence,
} from "./runtime-experiment-diagnostic-evidence.js";

export interface RuntimeDiagnosticArmPredicateBinding {
  predicate: string;
  armId: string;
}

export interface RuntimeDiagnosticRolePredicateBinding {
  predicate: string;
  role: "control" | "treatment";
  state: "present" | "absent";
  requireInterventionContrast?: boolean;
  requireExpectedContrast?: boolean;
}

export interface RuntimeDiagnosticPredicateBindings {
  contradictionPredicates?: readonly string[];
  contradictionArmPredicates?: readonly RuntimeDiagnosticArmPredicateBinding[];
  contradictionRolePredicates?: readonly RuntimeDiagnosticRolePredicateBinding[];
  designMatchPredicates?: readonly string[];
  designMatchArmPredicates?: readonly RuntimeDiagnosticArmPredicateBinding[];
  designMatchRolePredicates?: readonly RuntimeDiagnosticRolePredicateBinding[];
  engineConstraintPredicates?: readonly string[];
  engineConstraintArmPredicates?: readonly RuntimeDiagnosticArmPredicateBinding[];
  engineConstraintRolePredicates?: readonly RuntimeDiagnosticRolePredicateBinding[];
  compatibilityDifferencePredicates?: readonly string[];
  compatibilityDifferenceArmPredicates?: readonly RuntimeDiagnosticArmPredicateBinding[];
  compatibilityDifferenceRolePredicates?: readonly RuntimeDiagnosticRolePredicateBinding[];
  runtimeProofPredicates?: readonly string[];
  runtimeProofArmPredicates?: readonly RuntimeDiagnosticArmPredicateBinding[];
  runtimeProofRolePredicates?: readonly RuntimeDiagnosticRolePredicateBinding[];
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

function presentArmEvidenceIds(
  bindings: readonly RuntimeDiagnosticArmPredicateBinding[] | undefined,
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

  for (const binding of bindings ?? []) {
    const item = evidence.get(binding.predicate);
    if (!item || item.ceiling === "unknown") continue;

    const arm = item.armObservations?.find(
      (entry) => entry.armId === binding.armId,
    );
    if (!arm || arm.observation.state !== "present") continue;

    matchedPredicates.push(
      binding.predicate + "@arm:" + binding.armId,
    );
    evidenceIds.push(...arm.sourceEvidenceIds);
  }

  return {
    predicates: [...new Set(matchedPredicates)].sort(),
    evidenceIds: [...new Set(evidenceIds)].sort(),
  };
}

function runtimeProofArmEvidenceIds(
  bindings: readonly RuntimeDiagnosticArmPredicateBinding[] | undefined,
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

  for (const binding of bindings ?? []) {
    const item = evidence.get(binding.predicate);
    if (!item || item.ceiling === "unknown") continue;

    const arm = item.armObservations?.find(
      (entry) => entry.armId === binding.armId,
    );
    if (!arm || arm.observation.state === "unknown") continue;

    matchedPredicates.push(
      binding.predicate + "@arm:" + binding.armId,
    );
    evidenceIds.push(...arm.sourceEvidenceIds);
  }

  return {
    predicates: [...new Set(matchedPredicates)].sort(),
    evidenceIds: [...new Set(evidenceIds)].sort(),
  };
}

function roleEvidenceIds(
  bindings: readonly RuntimeDiagnosticRolePredicateBinding[] | undefined,
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

  for (const binding of bindings ?? []) {
    const item = evidence.get(binding.predicate);
    if (!item || item.ceiling === "unknown") continue;
    if (
      binding.requireInterventionContrast === true &&
      item.interventionContrast !== true
    ) {
      continue;
    }
    if (
      binding.requireExpectedContrast === true &&
      item.expectedContrastDisposition !== "matched"
    ) {
      continue;
    }

    const arm = item.armObservations?.find(
      (entry) =>
        entry.role === binding.role &&
        entry.observation.state === binding.state,
    );
    if (!arm) continue;

    matchedPredicates.push(
      binding.predicate +
        "@role:" +
        binding.role +
        "=" +
        binding.state,
    );
    evidenceIds.push(...arm.sourceEvidenceIds);
  }

  return {
    predicates: [...new Set(matchedPredicates)].sort(),
    evidenceIds: [...new Set(evidenceIds)].sort(),
  };
}

function mergeMatches(
  ...matches: readonly {
    predicates: readonly string[];
    evidenceIds: readonly string[];
  }[]
): {
  predicates: string[];
  evidenceIds: string[];
} {
  return {
    predicates: [
      ...new Set(matches.flatMap((item) => item.predicates)),
    ].sort(),
    evidenceIds: [
      ...new Set(matches.flatMap((item) => item.evidenceIds)),
    ].sort(),
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
      bridge.predicates.flatMap((item) => {
        if (item.ceiling === "unknown") return [];
        if (item.observation.state !== "unknown") {
          return item.sourceEvidenceIds;
        }
        return (item.armObservations ?? [])
          .filter(
            (arm) => arm.observation.state !== "unknown",
          )
          .flatMap((arm) => arm.sourceEvidenceIds);
      }),
    ),
  ].sort();
}

export function reclassifyIntentDiagnosticFromRuntime(
  input: RuntimeIntentDiagnosticReclassificationInput,
): RuntimeIntentDiagnosticReclassification {
  const evidence = byPredicate(input.bridge);

  const contradictions = mergeMatches(
    presentEvidenceIds(
      input.bindings.contradictionPredicates,
      evidence,
    ),
    presentArmEvidenceIds(
      input.bindings.contradictionArmPredicates,
      evidence,
    ),
    roleEvidenceIds(
      input.bindings.contradictionRolePredicates,
      evidence,
    ),
  );
  const designMatches = mergeMatches(
    presentEvidenceIds(
      input.bindings.designMatchPredicates,
      evidence,
    ),
    presentArmEvidenceIds(
      input.bindings.designMatchArmPredicates,
      evidence,
    ),
    roleEvidenceIds(
      input.bindings.designMatchRolePredicates,
      evidence,
    ),
  );
  const engineConstraints = mergeMatches(
    presentEvidenceIds(
      input.bindings.engineConstraintPredicates,
      evidence,
    ),
    presentArmEvidenceIds(
      input.bindings.engineConstraintArmPredicates,
      evidence,
    ),
    roleEvidenceIds(
      input.bindings.engineConstraintRolePredicates,
      evidence,
    ),
  );
  const compatibilityDifferences = mergeMatches(
    presentEvidenceIds(
      input.bindings.compatibilityDifferencePredicates,
      evidence,
    ),
    presentArmEvidenceIds(
      input.bindings.compatibilityDifferenceArmPredicates,
      evidence,
    ),
    roleEvidenceIds(
      input.bindings.compatibilityDifferenceRolePredicates,
      evidence,
    ),
  );
  const runtimeProof = mergeMatches(
    runtimeProofEvidenceIds(
      input.bindings.runtimeProofPredicates,
      evidence,
    ),
    runtimeProofArmEvidenceIds(
      input.bindings.runtimeProofArmPredicates,
      evidence,
    ),
    roleEvidenceIds(
      input.bindings.runtimeProofRolePredicates,
      evidence,
    ),
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
