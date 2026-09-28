import type {
  RuntimeEvidenceRecord,
  RuntimeEvidenceState,
  RuntimeScope,
  RuntimeVerificationExperimentContract,
} from "../../project-model/src/index.js";
import {
  runtimeScopeContains,
  runtimeScopeKey,
} from "../../project-model/src/index.js";
import type {
  RuntimeTemporalRequirement,
} from "../../project-model/src/index.js";
import type {
  RepairVerificationReceipt,
} from "./repair-lifecycle.js";
import type {
  RepairProofBundle,
} from "./repair-proof-bundle.js";
import {
  assessRuntimeTemporalRequirements,
} from "./runtime-temporal-analysis.js";

export interface RepairRuntimeStateRequirement {
  id: string;
  predicate: string;
  expectedState: Exclude<RuntimeEvidenceState, "unknown">;
  scope?: RuntimeScope;
}

export interface RepairRuntimeVerificationPlan {
  transactionId: string;
  stateRequirements: readonly RepairRuntimeStateRequirement[];
  temporalRequirements: readonly RuntimeTemporalRequirement[];
  experimentContract?: RuntimeVerificationExperimentContract;
}

export interface RepairRuntimeVerificationOptions {
  expectedTargetProfileFingerprint?: string;
  executedExperimentContract?: RuntimeVerificationExperimentContract;
}

export function repairRuntimeExperimentContractsFromProof(
  proof: RepairProofBundle,
): RuntimeVerificationExperimentContract[] {
  const grouped = new Map<
    string,
    {
      interventionId: string;
      experimentRevision: string;
      targetProfileFingerprint: string;
      fixtureFingerprint: string;
      predicateIds: string[];
      factorContrasts: RuntimeVerificationExperimentContract["factorContrasts"];
      expectedContrasts: RuntimeVerificationExperimentContract["expectedContrasts"];
    }
  >();

  for (const item of proof.causalInterventionProvenance ?? []) {
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
        current.expectedContrasts = [
          ...current.expectedContrasts,
          {
            predicateId: item.predicateId,
            controlState: item.controlState,
            treatmentState: item.treatmentState,
          },
        ];
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

export interface RepairRuntimeVerificationResult {
  passed: boolean;
  satisfiedStateRequirementIds: readonly string[];
  failedStateRequirementIds: readonly string[];
  temporalAssessments: ReturnType<
    typeof assessRuntimeTemporalRequirements
  >;
  evidenceIds: readonly string[];
  receipt?: RepairVerificationReceipt;
  reasons: readonly string[];
}

function evidenceId(record: RuntimeEvidenceRecord): string {
  const point = record.observedAt;
  return [
    "runtime",
    record.predicate,
    record.state,
    runtimeScopeKey(record.scope),
    point?.streamId ?? "",
    point?.sequence ?? "",
    point?.tick ?? "",
    point?.timestamp ?? "",
  ].join(":");
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

function canonicalExpectedContrasts(
  contract: RuntimeVerificationExperimentContract,
): string[] {
  return contract.expectedContrasts
    .map((item) =>
      JSON.stringify([
        item.predicateId,
        item.controlState,
        item.treatmentState,
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

function matchingObservedEvidence(
  records: readonly RuntimeEvidenceRecord[],
  requirement: RepairRuntimeStateRequirement,
  options: RepairRuntimeVerificationOptions,
): RuntimeEvidenceRecord[] {
  return records.filter((record) =>
    record.confidence === "observed" &&
    record.predicate === requirement.predicate &&
    record.state === requirement.expectedState &&
    (
      options.expectedTargetProfileFingerprint === undefined ||
      record.targetProfileFingerprint ===
        options.expectedTargetProfileFingerprint
    ) &&
    runtimeScopeContains(record.scope, requirement.scope)
  );
}

export function verifyRepairRuntimeEvidence(
  plan: RepairRuntimeVerificationPlan,
  records: readonly RuntimeEvidenceRecord[],
  continuityComplete = true,
  options: RepairRuntimeVerificationOptions = {},
): RepairRuntimeVerificationResult {
  const satisfiedStateRequirementIds: string[] = [];
  const failedStateRequirementIds: string[] = [];
  const selectedEvidence = new Map<string, RuntimeEvidenceRecord>();

  for (const requirement of plan.stateRequirements) {
    const matches = matchingObservedEvidence(
      records,
      requirement,
      options,
    );

    if (matches.length === 0) {
      failedStateRequirementIds.push(requirement.id);
      continue;
    }

    satisfiedStateRequirementIds.push(requirement.id);
    const selected = matches
      .slice()
      .sort((a, b) =>
        evidenceId(a).localeCompare(evidenceId(b))
      )[0]!;
    selectedEvidence.set(evidenceId(selected), selected);
  }

  const temporalAssessments =
    assessRuntimeTemporalRequirements(
      records.filter(
        (record) =>
          record.confidence === "observed" &&
          (
            options.expectedTargetProfileFingerprint === undefined ||
            record.targetProfileFingerprint ===
              options.expectedTargetProfileFingerprint
          ),
      ),
      plan.temporalRequirements,
      continuityComplete,
    );

  const failedTemporal = temporalAssessments.filter(
    (assessment) => assessment.status !== "satisfied",
  );

  for (const assessment of temporalAssessments) {
    if (assessment.status !== "satisfied") continue;
    if (assessment.before) {
      selectedEvidence.set(
        evidenceId(assessment.before),
        assessment.before,
      );
    }
    if (assessment.after) {
      selectedEvidence.set(
        evidenceId(assessment.after),
        assessment.after,
      );
    }
  }

  const hasRequirements =
    plan.stateRequirements.length > 0 ||
    plan.temporalRequirements.length > 0;

  const experimentContractSatisfied =
    plan.experimentContract === undefined ||
    runtimeVerificationExperimentContractCompatible(
      plan.experimentContract,
      options.executedExperimentContract,
    );

  const passed =
    hasRequirements &&
    experimentContractSatisfied &&
    failedStateRequirementIds.length === 0 &&
    failedTemporal.length === 0 &&
    selectedEvidence.size > 0;

  const ids = [...selectedEvidence.keys()].sort();
  const reasons: string[] = [];

  if (!hasRequirements) {
    reasons.push(
      "Runtime verification plan must contain at least one state or temporal requirement.",
    );
  }

  if (!experimentContractSatisfied) {
    reasons.push(
      "Post-repair runtime verification did not execute the exact experiment contract that authorized the repair.",
    );
  }

  if (failedStateRequirementIds.length > 0) {
    reasons.push(
      "Missing observed runtime state proof for requirement(s): " +
        failedStateRequirementIds.sort().join(", ") +
        ".",
    );
  }

  if (failedTemporal.length > 0) {
    reasons.push(
      "Temporal runtime proof is incomplete or violated for requirement(s): " +
        failedTemporal
          .map((item) => item.requirementId)
          .sort()
          .join(", ") +
        ".",
    );
  }

  if (passed) {
    reasons.push(
      "All required runtime state and temporal invariants are satisfied by observed evidence.",
    );
  }

  return {
    passed,
    satisfiedStateRequirementIds:
      satisfiedStateRequirementIds.sort(),
    failedStateRequirementIds:
      failedStateRequirementIds.sort(),
    temporalAssessments,
    evidenceIds: ids,
    ...(passed
      ? {
          receipt: {
            transactionId: plan.transactionId,
            kind: "runtime" as const,
            passed: true,
            evidenceIds: ids,
          },
        }
      : {}),
    reasons,
  };
}
