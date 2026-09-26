import type {
  InvariantRegistryEntry,
  InvariantRegistrySnapshot,
  RuntimeEvidenceRecord,
} from "../../project-model/src/index.js";
import {
  validateRepairPreservationContract,
  type PreservationVerificationReceipt,
  type RepairPreservationContract,
} from "../../preservation/src/index.js";
import {
  verifyRepairRuntimeEvidence,
} from "./repair-runtime-verification.js";

export interface RepairPreservationVerificationInput {
  contract: RepairPreservationContract;
  invariantRegistry: InvariantRegistrySnapshot;
  runtimeEvidence: readonly RuntimeEvidenceRecord[];
  staticEvidenceByInvariant?: Readonly<Record<string, readonly string[]>>;
  continuityComplete?: boolean;
  expectedTargetProfileFingerprint?: string;
  observedSideEffectIds?: readonly string[];
  sideEffectObservationComplete?: boolean;
}

export interface RepairPreservationVerificationResult {
  passed: boolean;
  verifiedMustChangeInvariantIds: readonly string[];
  verifiedMustPreserveInvariantIds: readonly string[];
  failedInvariantIds: readonly string[];
  evidenceIds: readonly string[];
  receipt?: PreservationVerificationReceipt;
  reasons: readonly string[];
}

function prefixedEntry(
  entry: InvariantRegistryEntry,
): {
  stateRequirements: {
    id: string;
    predicate: string;
    expectedState: "present" | "absent";
    scope?: NonNullable<
      InvariantRegistryEntry["stateRequirements"][number]["scope"]
    >;
  }[];
  temporalRequirements: {
    id: string;
    beforePredicate: string;
    afterPredicate: string;
    maxTickDelta?: number;
    scope?: NonNullable<
      InvariantRegistryEntry["temporalRequirements"][number]["scope"]
    >;
  }[];
} {
  return {
    stateRequirements: entry.stateRequirements.map((requirement) => ({
      id: entry.id + "::" + requirement.id,
      predicate: requirement.predicate,
      expectedState: requirement.expectedState,
      ...(requirement.scope === undefined
        ? {}
        : { scope: requirement.scope }),
    })),
    temporalRequirements: entry.temporalRequirements.map((requirement) => ({
      id: entry.id + "::" + requirement.id,
      beforePredicate: requirement.beforePredicate,
      afterPredicate: requirement.afterPredicate,
      ...(requirement.maxTickDelta === undefined
        ? {}
        : { maxTickDelta: requirement.maxTickDelta }),
      ...(requirement.scope === undefined
        ? {}
        : { scope: requirement.scope }),
    })),
  };
}

function targetBoundRecords(
  records: readonly RuntimeEvidenceRecord[],
  expected: string | undefined,
): RuntimeEvidenceRecord[] {
  if (!expected) return [...records];
  return records.filter((record) =>
    record.targetProfileFingerprint === expected
  );
}

export function verifyRepairPreservation(
  input: RepairPreservationVerificationInput,
): RepairPreservationVerificationResult {
  const reasons = validateRepairPreservationContract(input.contract);
  const registry = new Map(
    input.invariantRegistry.entries.map((entry) => [entry.id, entry]),
  );
  const evidenceIds = new Set<string>();
  const passedIds = new Set<string>();
  const failedIds = new Set<string>();
  const staticEvidence = input.staticEvidenceByInvariant ?? {};
  const runtimeRecords = targetBoundRecords(
    input.runtimeEvidence,
    input.expectedTargetProfileFingerprint,
  );

  const verifyInvariant = (invariantId: string): void => {
    const entry = registry.get(invariantId);
    if (!entry) {
      failedIds.add(invariantId);
      reasons.push(
        "Preservation verification references invariant outside the active registry: " +
          invariantId +
          ".",
      );
      return;
    }

    if (entry.enforcement === "diagnostic-only") {
      failedIds.add(invariantId);
      reasons.push(
        "Diagnostic-only invariant cannot verify preservation: " +
          invariantId +
          ".",
      );
      return;
    }

    if (entry.enforcement === "static") {
      const ids = staticEvidence[invariantId] ?? [];
      if (ids.length === 0) {
        failedIds.add(invariantId);
        reasons.push(
          "Static preservation invariant has no post-repair proof: " +
            invariantId +
            ".",
        );
        return;
      }
      ids.forEach((id) => evidenceIds.add(id));
      passedIds.add(invariantId);
      return;
    }

    const requirements = prefixedEntry(entry);
    const result = verifyRepairRuntimeEvidence(
      {
        transactionId: input.contract.transactionId,
        stateRequirements: requirements.stateRequirements,
        temporalRequirements: requirements.temporalRequirements,
      },
      runtimeRecords,
      input.continuityComplete ?? true,
      {
        expectedTargetProfileFingerprint:
          input.expectedTargetProfileFingerprint,
      },
    );

    if (!result.passed) {
      failedIds.add(invariantId);
      reasons.push(
        "Post-repair runtime preservation proof failed for " +
          invariantId +
          ": " +
          result.reasons.join(" "),
      );
      return;
    }

    result.evidenceIds.forEach((id) => evidenceIds.add(id));
    passedIds.add(invariantId);
  };

  const allInvariantIds = [
    ...input.contract.mustChangeInvariantIds,
    ...input.contract.mustPreserveInvariantIds,
  ];
  for (const invariantId of allInvariantIds) {
    verifyInvariant(invariantId);
  }

  const forbidden = new Set(
    input.contract.forbiddenSideEffectIds ?? [],
  );
  if (forbidden.size > 0) {
    if (input.sideEffectObservationComplete !== true) {
      reasons.push(
        "Forbidden side effects are declared but post-repair side-effect observation is incomplete.",
      );
    } else {
      const observedForbidden = [
        ...new Set(input.observedSideEffectIds ?? []),
      ].filter((id) => forbidden.has(id)).sort();
      if (observedForbidden.length > 0) {
        reasons.push(
          "Forbidden side effect observed after repair: " +
            observedForbidden.join(", ") +
            ".",
        );
      }
    }
  }

  const verifiedMustChangeInvariantIds =
    input.contract.mustChangeInvariantIds
      .filter((id) => passedIds.has(id))
      .sort();
  const verifiedMustPreserveInvariantIds =
    input.contract.mustPreserveInvariantIds
      .filter((id) => passedIds.has(id))
      .sort();
  const failedInvariantIds = [...failedIds].sort();

  const passed =
    reasons.length === 0 &&
    failedInvariantIds.length === 0 &&
    verifiedMustChangeInvariantIds.length ===
      input.contract.mustChangeInvariantIds.length &&
    verifiedMustPreserveInvariantIds.length ===
      input.contract.mustPreserveInvariantIds.length &&
    evidenceIds.size > 0;

  if (passed) {
    reasons.push(
      "All must-change and must-preserve invariants are verified after repair, with no observed forbidden side effect.",
    );
  }

  const ids = [...evidenceIds].sort();
  return {
    passed,
    verifiedMustChangeInvariantIds,
    verifiedMustPreserveInvariantIds,
    failedInvariantIds,
    evidenceIds: ids,
    ...(passed
      ? {
          receipt: {
            contractId: input.contract.id,
            transactionId: input.contract.transactionId,
            passed: true,
            verifiedMustChangeInvariantIds,
            verifiedMustPreserveInvariantIds,
            evidenceIds: ids,
          },
        }
      : {}),
    reasons,
  };
}
