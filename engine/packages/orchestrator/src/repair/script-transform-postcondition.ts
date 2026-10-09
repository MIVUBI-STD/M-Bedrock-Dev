import { createHash } from "node:crypto";
import {
  parseScriptFile,
} from "../../../../analyzers/scripts/src/index.js";
import type {
  RepairSourceTransformHint,
  SourceRef,
} from "../../../project-model/src/index.js";
import {
  validateRepairSourceTransformHint,
} from "../../../project-model/src/index.js";
import type {
  RepairTransformHintProposal,
} from "./script-transform-hint-realizer.js";
import {
  patchTransactionSemanticFingerprint,
} from "../../../repair/src/index.js";

export interface ScriptTransformPostconditionProof {
  status: "proven" | "blocked";
  hintId: string;
  family: RepairSourceTransformHint["family"];
  proofFingerprint?: string;
  transformedText?: string;
  reasons: readonly string[];
}

function countOccurrences(
  text: string,
  needle: string,
): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let offset = 0;

  while (true) {
    const index = text.indexOf(
      needle,
      offset,
    );
    if (index < 0) return count;
    count += 1;
    offset = index + needle.length;
  }
}

function lineMatches(
  source: SourceRef | undefined,
  expected: SourceRef,
): boolean {
  return (
    source?.relativePath ===
      expected.relativePath &&
    source.range?.lineStart ===
      expected.range?.lineStart
  );
}

function noEquivalentHintRemains(
  parsed: ReturnType<typeof parseScriptFile>,
  hint: RepairSourceTransformHint,
): boolean {
  return !(
    parsed.repairTransformHints ?? []
  ).some(
    (candidate) =>
      candidate.family === hint.family &&
      candidate.source.relativePath ===
        hint.source.relativePath &&
      candidate.source.range?.lineStart ===
        hint.source.range?.lineStart &&
      candidate.supportedPredicateIds.some(
        (id) =>
          hint.supportedPredicateIds.includes(
            id,
          ),
      ) &&
      candidate.supportedFactorIds.some(
        (id) =>
          hint.supportedFactorIds.includes(
            id,
          ),
      ),
  );
}

function generationGuardProven(
  parsed: ReturnType<typeof parseScriptFile>,
  hint: RepairSourceTransformHint,
): boolean {
  return parsed.deferredCallbacks.some(
    (callback) =>
      lineMatches(
        callback.source,
        hint.source,
      ) &&
      callback.guardEvidence ===
        "explicit-generation-check",
  );
}

function persistenceGuardProven(
  parsed: ReturnType<typeof parseScriptFile>,
  hint: RepairSourceTransformHint,
): boolean {
  return (
    parsed.persistenceIdempotencyGuards ?? []
  ).some(
    (guard) =>
      lineMatches(
        guard.sideEffectSource,
        hint.source,
      ),
  );
}

function arenaCapacityGuardProven(
  parsed: ReturnType<typeof parseScriptFile>,
  hint: RepairSourceTransformHint,
): boolean {
  return (
    parsed.arenaAuthorityPaths ?? []
  ).some(
    (path) =>
      path.capacityAuthorityProven &&
      lineMatches(
        path.membershipCommit?.source,
        hint.source,
      ),
  );
}

function arenaStartGuardProven(
  parsed: ReturnType<typeof parseScriptFile>,
  hint: RepairSourceTransformHint,
): boolean {
  return (
    parsed.arenaAuthorityPaths ?? []
  ).some(
    (path) =>
      path.startGuardProven &&
      lineMatches(
        path.startOwnerAcquire?.source,
        hint.source,
      ),
  );
}

function familyPostcondition(
  parsed: ReturnType<typeof parseScriptFile>,
  hint: RepairSourceTransformHint,
): {
  proven: boolean;
  reason: string;
} {
  if (
    hint.family ===
      "scheduler-generation-guard" ||
    hint.family ===
      "session-generation-guard"
  ) {
    return {
      proven:
        generationGuardProven(
          parsed,
          hint,
        ),
      reason:
        "Transformed deferred callback must expose explicit generation guard evidence.",
    };
  }

  if (
    hint.family ===
      "persistence-idempotency-guard"
  ) {
    return {
      proven:
        persistenceGuardProven(
          parsed,
          hint,
        ),
      reason:
        "Transformed persistence side effect must expose an applied-generation idempotency guard.",
    };
  }

  if (
    hint.family ===
      "arena-ownership-guard"
  ) {
    const capacity =
      hint.supportedPredicateIds.includes(
        "arena-capacity-overflow-observed",
      );
    if (capacity) {
      return {
        proven:
          arenaCapacityGuardProven(
            parsed,
            hint,
          ),
        reason:
          "Transformed arena membership commit must be covered by the authored capacity expression.",
      };
    }

    const start =
      hint.supportedPredicateIds.includes(
        "arena-start-ownership-violation-observed",
      );
    if (start) {
      return {
        proven:
          arenaStartGuardProven(
            parsed,
            hint,
          ),
        reason:
          "Transformed arena start owner assignment must expose an exclusive owner guard.",
      };
    }
  }

  return {
    proven: false,
    reason:
      "No static postcondition evaluator exists for this repair transform family/predicate combination.",
  };
}

function proofFingerprint(
  identifier: string,
  transformedText: string,
  hint: RepairSourceTransformHint,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        identifier,
        family: hint.family,
        hintId: hint.id,
        analyzerId: hint.analyzerId,
        analyzerRevision:
          hint.analyzerRevision,
        parserId: hint.parserId,
        parserRevision: hint.parserRevision,
        transformedText,
      }),
    )
    .digest("hex");
}

export function proveScriptTransformPostcondition(
  identifier: string,
  originalText: string,
  source: SourceRef,
  hint: RepairSourceTransformHint,
): ScriptTransformPostconditionProof {
  const hintErrors =
    validateRepairSourceTransformHint(hint);
  if (hintErrors.length > 0) {
    return {
      status: "blocked",
      hintId: hint.id,
      family: hint.family,
      reasons: hintErrors,
    };
  }

  if (
    source.artifactId !==
      hint.source.artifactId ||
    source.relativePath !==
      hint.source.relativePath
  ) {
    return {
      status: "blocked",
      hintId: hint.id,
      family: hint.family,
      reasons: [
        "Post-transform proof source does not match transform hint source.",
      ],
    };
  }

  const occurrences = countOccurrences(
    originalText,
    hint.expectedText,
  );
  if (occurrences !== 1) {
    return {
      status: "blocked",
      hintId: hint.id,
      family: hint.family,
      reasons: [
        "Transform hint expected source text must occur exactly once in the isolated source snapshot; observed " +
          occurrences +
          ".",
      ],
    };
  }

  const transformedText =
    originalText.replace(
      hint.expectedText,
      hint.replacementText,
    );
  const parsed = parseScriptFile(
    identifier,
    transformedText,
    source,
  );

  const reasons: string[] = [];
  if (
    !noEquivalentHintRemains(
      parsed,
      hint,
    )
  ) {
    reasons.push(
      "Equivalent repair transform hint remains after transformation.",
    );
  }

  const postcondition =
    familyPostcondition(
      parsed,
      hint,
    );
  if (!postcondition.proven) {
    reasons.push(postcondition.reason);
  }

  if (reasons.length > 0) {
    return {
      status: "blocked",
      hintId: hint.id,
      family: hint.family,
      transformedText,
      reasons,
    };
  }

  return {
    status: "proven",
    hintId: hint.id,
    family: hint.family,
    transformedText,
    proofFingerprint:
      proofFingerprint(
        identifier,
        transformedText,
        hint,
      ),
    reasons: [
      "Isolated transformed source reparsed successfully, the original transform opportunity disappeared, and the intended static guard evidence is observable.",
    ],
  };
}


export type BoundScriptTransformPostcondition =
  | {
      status: "bound";
      proposal: RepairTransformHintProposal;
    }
  | {
      status: "blocked";
      reasons: readonly string[];
    };

export function bindScriptTransformPostconditionProof(
  proposal: RepairTransformHintProposal,
  proof: ScriptTransformPostconditionProof,
): BoundScriptTransformPostcondition {
  const reasons: string[] = [];

  if (proof.status !== "proven") {
    reasons.push(
      "Post-transform semantic proof is not proven.",
    );
  }
  if (proposal.hintId !== proof.hintId) {
    reasons.push(
      "Post-transform proof hint id does not match the realized proposal.",
    );
  }
  if (proposal.hintFamily !== proof.family) {
    reasons.push(
      "Post-transform proof family does not match the realized proposal.",
    );
  }
  if (!proof.proofFingerprint?.trim()) {
    reasons.push(
      "Post-transform proof is missing a proof fingerprint.",
    );
  }

  if (reasons.length > 0) {
    return {
      status: "blocked",
      reasons,
    };
  }

  return {
    status: "bound",
    proposal: {
      ...proposal,
      strategy: {
        ...proposal.strategy,
        postTransformProofRequired: true,
        postTransformProof: {
          hintId: proof.hintId,
          family: proof.family,
          proofFingerprint:
            proof.proofFingerprint!,
          transactionId:
            proposal.strategy.transaction.id,
          transactionFingerprint:
            patchTransactionSemanticFingerprint(
              proposal.strategy.transaction,
            ),
        },
      },
    },
  };
}


export function proveAndBindScriptTransformPostcondition(
  proposal: RepairTransformHintProposal,
  identifier: string,
  originalText: string,
  source: SourceRef,
  hint: RepairSourceTransformHint,
): BoundScriptTransformPostcondition & {
  proof: ScriptTransformPostconditionProof;
} {
  const proof = proveScriptTransformPostcondition(
    identifier,
    originalText,
    source,
    hint,
  );
  const bound =
    bindScriptTransformPostconditionProof(
      proposal,
      proof,
    );

  return {
    ...bound,
    proof,
  };
}
