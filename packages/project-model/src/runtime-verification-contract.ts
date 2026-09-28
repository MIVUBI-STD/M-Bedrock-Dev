import type {
  CausalControlledFactorContrast,
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
