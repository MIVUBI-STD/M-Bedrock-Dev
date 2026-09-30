import type {
  PreservationTraceComparison,
} from "./trace-diff.js";
import {
  validateRepairPreservationContract,
} from "./validate.js";
import type {
  PreservationInvariantBaselineRecord,
  PreservationVerificationReceipt,
  RepairPreservationContract,
} from "./types.js";

export interface PreservationVerificationInput {
  contract: RepairPreservationContract;
  postRepairInvariantResults:
    readonly PreservationInvariantBaselineRecord[];
  traceComparison?: PreservationTraceComparison;
  observedSideEffectIds?: readonly string[];
  sideEffectObservationComplete?: boolean;
  additionalEvidenceIds?: readonly string[];
}

export function evaluatePreservationVerification(
  input: PreservationVerificationInput,
): PreservationVerificationReceipt {
  const reasons = [
    ...validateRepairPreservationContract(
      input.contract,
    ),
  ];

  const results = new Map(
    input.postRepairInvariantResults.map(
      (result) => [
        result.invariantId,
        result,
      ],
    ),
  );

  const verifiedMustChange: string[] = [];
  const verifiedMustPreserve: string[] = [];
  const evidenceIds = new Set(
    input.additionalEvidenceIds ?? [],
  );

  for (
    const invariantId of
      input.contract.mustChangeInvariantIds
  ) {
    const result = results.get(invariantId);
    if (!result) {
      reasons.push(
        "Must-change invariant has no post-repair result: " +
          invariantId +
          ".",
      );
      continue;
    }
    if (result.state !== "satisfied") {
      reasons.push(
        "Must-change invariant is not proven satisfied after repair: " +
          invariantId +
          ".",
      );
      continue;
    }
    if (result.evidenceIds.length === 0) {
      reasons.push(
        "Must-change invariant has no post-repair evidence: " +
          invariantId +
          ".",
      );
      continue;
    }
    verifiedMustChange.push(invariantId);
    result.evidenceIds.forEach(
      (id) => evidenceIds.add(id),
    );
  }

  for (
    const invariantId of
      input.contract.mustPreserveInvariantIds
  ) {
    const result = results.get(invariantId);
    if (!result) {
      reasons.push(
        "Must-preserve invariant has no post-repair result: " +
          invariantId +
          ".",
      );
      continue;
    }
    if (result.state !== "satisfied") {
      reasons.push(
        "Must-preserve invariant regressed or remains unknown after repair: " +
          invariantId +
          ".",
      );
      continue;
    }
    if (result.evidenceIds.length === 0) {
      reasons.push(
        "Must-preserve invariant has no post-repair evidence: " +
          invariantId +
          ".",
      );
      continue;
    }
    verifiedMustPreserve.push(invariantId);
    result.evidenceIds.forEach(
      (id) => evidenceIds.add(id),
    );
  }

  const observedSideEffects = new Set(
    input.observedSideEffectIds ?? [],
  );
  const forbidden = (
    input.contract.forbiddenSideEffectIds ?? []
  ).filter((id) =>
    observedSideEffects.has(id)
  );

  if (forbidden.length > 0) {
    reasons.push(
      "Forbidden side effects were observed: " +
        forbidden.sort().join(", ") +
        ".",
    );
  }

  if (
    (input.contract.forbiddenSideEffectIds
      ?.length ?? 0) > 0 &&
    input.sideEffectObservationComplete !== true
  ) {
    reasons.push(
      "Forbidden-side-effect verification requires complete side-effect observation.",
    );
  }

  const unexpectedBehaviorKeys =
    input.traceComparison?.stateDeltas
      .filter(
        (delta) =>
          delta.classification ===
            "unexpected" ||
          delta.classification ===
            "must-preserve",
      )
      .map((delta) => delta.stateKey)
      .filter(
        (value, index, all) =>
          all.indexOf(value) === index,
      )
      .sort() ?? [];

  if (
    input.contract.semanticTracePolicyId
  ) {
    if (!input.traceComparison) {
      reasons.push(
        "Preservation contract requires semantic trace verification but no comparison was provided.",
      );
    } else if (
      input.traceComparison.policyId !==
        input.contract.semanticTracePolicyId
    ) {
      reasons.push(
        "Semantic trace comparison belongs to another preservation policy.",
      );
    } else if (
      input.traceComparison.disposition !==
        "equivalent" &&
      input.traceComparison.disposition !==
        "changed-as-intended"
    ) {
      reasons.push(
        "Semantic trace comparison did not prove preservation: " +
          input.traceComparison.disposition +
          ".",
      );
    }
  }

  return {
    contractId: input.contract.id,
    transactionId:
      input.contract.transactionId,
    passed: reasons.length === 0,
    verifiedMustChangeInvariantIds:
      verifiedMustChange.sort(),
    verifiedMustPreserveInvariantIds:
      verifiedMustPreserve.sort(),
    evidenceIds: [...evidenceIds].sort(),
    ...(input.traceComparison === undefined
      ? {}
      : {
          semanticTraceDisposition:
            input.traceComparison.disposition,
        }),
    ...(unexpectedBehaviorKeys.length === 0
      ? {}
      : {
          unexpectedBehaviorKeys,
        }),
    ...(forbidden.length === 0
      ? {}
      : {
          observedForbiddenSideEffectIds:
            forbidden.sort(),
        }),
    reasons:
      reasons.length === 0
        ? [
            "Post-repair invariants, side-effect constraints, and required semantic trace preservation are satisfied.",
          ]
        : reasons,
  };
}
