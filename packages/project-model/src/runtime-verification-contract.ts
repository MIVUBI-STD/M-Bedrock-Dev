import type {
  CausalControlledFactorContrast,
  CausalInterventionProvenance,
} from "./causal-proof.js";

export interface RuntimeVerificationExpectedContrast {
  predicateId: string;
  controlState: "present" | "absent";
  treatmentState: "present" | "absent";
}

export interface RuntimeVerificationExperimentContract {
  interventionId: string;
  experimentRevision: string;
  compatibleWithRevisions?: readonly string[];
  targetProfileFingerprint: string;
  fixtureFingerprint: string;
  predicateIds: readonly string[];
  factorContrasts: readonly CausalControlledFactorContrast[];
  expectedContrasts: readonly RuntimeVerificationExpectedContrast[];
}

function sameStringSet(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const a = [...new Set(left)].sort();
  const b = [...new Set(right)].sort();
  return (
    a.length === b.length &&
    a.every((value, index) => value === b[index])
  );
}

function canonicalFactorContrasts(
  contract: RuntimeVerificationExperimentContract,
): string[] {
  return contract.factorContrasts
    .map((item) =>
      JSON.stringify([
        item.factorId,
        item.controlValue,
        item.treatmentValue,
      ])
    )
    .sort();
}

export function runtimeVerificationExperimentContractCompatible(
  expected: RuntimeVerificationExperimentContract,
  actual: RuntimeVerificationExperimentContract | undefined,
): boolean {
  if (!actual) return false;

  const revisionCompatible =
    actual.experimentRevision === expected.experimentRevision ||
    (actual.compatibleWithRevisions ?? []).includes(
      expected.experimentRevision,
    );

  const predicatesCoverExpected =
    expected.predicateIds.every((predicateId) =>
      actual.predicateIds.includes(predicateId)
    );

  return (
    revisionCompatible &&
    actual.interventionId === expected.interventionId &&
    actual.targetProfileFingerprint === expected.targetProfileFingerprint &&
    actual.fixtureFingerprint === expected.fixtureFingerprint &&
    predicatesCoverExpected &&
    sameStringSet(
      canonicalFactorContrasts(actual),
      canonicalFactorContrasts(expected),
    ) &&
    expected.expectedContrasts.every((item) =>
      actual.expectedContrasts.some(
        (candidate) =>
          candidate.predicateId === item.predicateId &&
          candidate.controlState === item.controlState &&
          candidate.treatmentState === item.treatmentState,
      )
    )
  );
}

export function runtimeVerificationExperimentContractsFromProvenance(
  provenance: readonly CausalInterventionProvenance[],
): RuntimeVerificationExperimentContract[] {
  const grouped = new Map<
    string,
    {
      interventionId: string;
      experimentRevision: string;
      targetProfileFingerprint: string;
      fixtureFingerprint: string;
      predicateIds: string[];
      factorContrasts: CausalControlledFactorContrast[];
      expectedContrasts: RuntimeVerificationExpectedContrast[];
    }
  >();

  for (const item of provenance) {
    if (
      !item.experimentRevision?.trim() ||
      !item.targetProfileFingerprint?.trim() ||
      !item.fixtureFingerprint?.trim() ||
      !item.predicateId?.trim()
    ) {
      continue;
    }

    const key = [
      item.interventionId,
      item.experimentRevision,
      item.targetProfileFingerprint,
      item.fixtureFingerprint,
    ].join("::");
    const current = grouped.get(key);
    if (current) {
      current.predicateIds.push(item.predicateId);
      if (
        item.controlState !== undefined &&
        item.treatmentState !== undefined
      ) {
        current.expectedContrasts.push({
          predicateId: item.predicateId,
          controlState: item.controlState,
          treatmentState: item.treatmentState,
        });
      }
      continue;
    }

    grouped.set(key, {
      interventionId: item.interventionId,
      experimentRevision: item.experimentRevision,
      targetProfileFingerprint: item.targetProfileFingerprint,
      fixtureFingerprint: item.fixtureFingerprint,
      predicateIds: [item.predicateId],
      factorContrasts: [...(item.controlledFactorContrasts ?? [])],
      expectedContrasts:
        item.controlState === undefined ||
        item.treatmentState === undefined
          ? []
          : [{
              predicateId: item.predicateId,
              controlState: item.controlState,
              treatmentState: item.treatmentState,
            }],
    });
  }

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      predicateIds: [...new Set(item.predicateIds)].sort(),
      factorContrasts: [...item.factorContrasts]
        .sort((a, b) => a.factorId.localeCompare(b.factorId)),
      expectedContrasts: [...item.expectedContrasts]
        .sort((a, b) => a.predicateId.localeCompare(b.predicateId)),
    }))
    .sort((a, b) =>
      a.interventionId.localeCompare(b.interventionId) ||
      a.experimentRevision.localeCompare(b.experimentRevision)
    );
}
