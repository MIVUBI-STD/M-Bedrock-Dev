import type {
  RuntimeEvidenceRecord,
  RuntimeEvidenceState,
  RuntimeScope,
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
}

export interface RepairRuntimeVerificationOptions {
  expectedTargetProfileFingerprint?: string;
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

  const passed =
    hasRequirements &&
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
