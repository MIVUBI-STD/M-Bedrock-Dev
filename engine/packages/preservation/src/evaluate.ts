import type {
  InvariantRegistrySnapshot,
} from "../../project-model/src/index.js";
import {
  validateRepairPreservationBaseline,
  validateRepairPreservationContract,
} from "./validate.js";
import type {
  PreservationReadinessResult,
  RepairPreservationBaseline,
  RepairPreservationContract,
} from "./types.js";

export interface PreservationReadinessInput {
  contract: RepairPreservationContract;
  baseline: RepairPreservationBaseline;
  invariantRegistry: InvariantRegistrySnapshot;
  currentSourceFingerprint: string;
  expectedTargetProfileFingerprint?: string;
}

export function evaluatePreservationReadiness(
  input: PreservationReadinessInput,
): PreservationReadinessResult {
  const reasons: string[] = [
    ...validateRepairPreservationContract(input.contract),
    ...validateRepairPreservationBaseline(input.baseline),
  ];

  if (input.baseline.contractId !== input.contract.id) {
    reasons.push("Preservation baseline belongs to another contract.");
  }
  if (input.baseline.sourceFingerprint !== input.currentSourceFingerprint) {
    reasons.push("Preservation baseline source fingerprint is stale.");
  }
  if (
    input.expectedTargetProfileFingerprint !== undefined &&
    input.baseline.targetProfileFingerprint !==
      input.expectedTargetProfileFingerprint
  ) {
    reasons.push(
      "Preservation baseline is not bound to the expected target runtime profile.",
    );
  }

  const registry = new Map(
    input.invariantRegistry.entries.map((entry) => [entry.id, entry]),
  );
  const baseline = new Map(
    input.baseline.invariantResults.map((result) => [
      result.invariantId,
      result,
    ]),
  );

  const allIds = [
    ...input.contract.mustChangeInvariantIds,
    ...input.contract.mustPreserveInvariantIds,
  ];
  for (const invariantId of allIds) {
    const invariant = registry.get(invariantId);
    if (!invariant) {
      reasons.push(
        "Preservation contract references invariant outside the active registry: " +
          invariantId +
          ".",
      );
      continue;
    }
    if (invariant.enforcement === "diagnostic-only") {
      reasons.push(
        "Diagnostic-only invariant cannot be used as preservation proof: " +
          invariantId +
          ".",
      );
    }
  }

  for (const invariantId of input.contract.mustChangeInvariantIds) {
    const result = baseline.get(invariantId);
    if (!result) {
      reasons.push(
        "Must-change invariant has no baseline result: " +
          invariantId +
          ".",
      );
      continue;
    }
    if (result.state !== "violated") {
      reasons.push(
        "Must-change invariant must be proven violated before repair: " +
          invariantId +
          ".",
      );
    }
  }

  for (const invariantId of input.contract.mustPreserveInvariantIds) {
    const result = baseline.get(invariantId);
    if (!result) {
      reasons.push(
        "Must-preserve invariant has no baseline result: " +
          invariantId +
          ".",
      );
      continue;
    }
    if (result.state !== "satisfied") {
      reasons.push(
        "Must-preserve invariant must be proven healthy before repair: " +
          invariantId +
          ".",
      );
    }
  }

  const evidenceIds = [
    ...new Set(
      allIds.flatMap((id) => baseline.get(id)?.evidenceIds ?? []),
    ),
  ].sort();

  if (reasons.length > 0) {
    return {
      contractId: input.contract.id,
      transactionId: input.contract.transactionId,
      disposition: "blocked",
      baselineEvidenceIds: evidenceIds,
      reasons,
    };
  }

  return {
    contractId: input.contract.id,
    transactionId: input.contract.transactionId,
    disposition: "ready",
    baselineEvidenceIds: evidenceIds,
    reasons: [
      "Must-change failure and must-preserve healthy baseline are explicitly evidenced under the active invariant registry.",
    ],
  };
}
