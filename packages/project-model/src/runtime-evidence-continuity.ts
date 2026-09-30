import type {
  RuntimeEvidenceRecord,
  RuntimeScope,
} from "./runtime-evidence.js";
import {
  runtimeScopeContains,
  runtimeScopeKey,
} from "./runtime-evidence.js";

export interface RuntimeEvidenceContinuityContract {
  targetProfileFingerprint: string;
  scope: RuntimeScope;
  provenanceKey?: string;
  requireObservedConfidence?: boolean;
}

export interface RuntimeEvidenceContinuityResult {
  status: "continuous" | "broken" | "unknown";
  acceptedRecords: readonly RuntimeEvidenceRecord[];
  rejectedRecords: readonly RuntimeEvidenceRecord[];
  reasons: readonly string[];
}

export function evaluateRuntimeEvidenceContinuity(
  records: readonly RuntimeEvidenceRecord[],
  contract: RuntimeEvidenceContinuityContract,
): RuntimeEvidenceContinuityResult {
  if (!contract.targetProfileFingerprint.trim()) {
    throw new Error(
      "Runtime evidence continuity requires a target profile fingerprint.",
    );
  }

  if (
    contract.scope.arenaId !== undefined &&
    contract.scope.arenaGeneration === undefined
  ) {
    throw new Error(
      "Arena-scoped continuity requires arenaGeneration.",
    );
  }

  const accepted: RuntimeEvidenceRecord[] = [];
  const rejected: RuntimeEvidenceRecord[] = [];

  for (const record of records) {
    const profileMatches =
      record.targetProfileFingerprint ===
      contract.targetProfileFingerprint;
    const scopeMatches =
      runtimeScopeContains(
        record.scope,
        contract.scope,
      );
    const provenanceMatches =
      contract.provenanceKey === undefined ||
      record.provenanceKey ===
        contract.provenanceKey;
    const confidenceMatches =
      contract.requireObservedConfidence !== true ||
      record.confidence === "observed";

    if (
      profileMatches &&
      scopeMatches &&
      provenanceMatches &&
      confidenceMatches
    ) {
      accepted.push(record);
    } else {
      rejected.push(record);
    }
  }

  if (records.length === 0) {
    return {
      status: "unknown",
      acceptedRecords: [],
      rejectedRecords: [],
      reasons: [
        "No runtime evidence records were supplied for the requested continuity contract.",
      ],
    };
  }

  if (accepted.length === 0) {
    return {
      status: "broken",
      acceptedRecords: [],
      rejectedRecords: rejected,
      reasons: [
        "No runtime evidence record matches the exact target profile and scope continuity contract.",
        "Required scope: " +
          runtimeScopeKey(contract.scope) +
          ".",
      ],
    };
  }

  const continuityKeys = [
    "arenaId",
    "arenaGeneration",
    "playerKey",
    "connectionGeneration",
    "lifeGeneration",
    "participationGeneration",
    "entityKey",
    "entityGeneration",
    "operationId",
    "subsystemGeneration",
    "bootGeneration",
  ] as const;

  const mixedScopeKeys = continuityKeys.filter((key) => {
    const values = new Set(
      accepted
        .map((record) => record.scope?.[key])
        .filter((value) => value !== undefined)
        .map(String),
    );
    return values.size > 1;
  });

  if (mixedScopeKeys.length > 0) {
    return {
      status: "broken",
      acceptedRecords: accepted,
      rejectedRecords: rejected,
      reasons: [
        "Runtime evidence campaign mixes generation/ownership identities: " +
          mixedScopeKeys.join(", ") +
          ".",
      ],
    };
  }

  if (rejected.length > 0) {
    return {
      status: "broken",
      acceptedRecords: accepted,
      rejectedRecords: rejected,
      reasons: [
        "Runtime evidence campaign contains records from another profile, scope, provenance campaign, or insufficient confidence.",
      ],
    };
  }

  return {
    status: "continuous",
    acceptedRecords: accepted,
    rejectedRecords: [],
    reasons: [
      "All runtime evidence records match the exact target profile, scope, and requested provenance continuity.",
    ],
  };
}
