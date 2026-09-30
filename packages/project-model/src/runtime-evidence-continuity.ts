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

function ownerGenerationConflicts(
  records: readonly RuntimeEvidenceRecord[],
  ownerKey:
    | "arenaId"
    | "playerKey"
    | "entityKey",
  generationKeys: readonly (
    | "arenaGeneration"
    | "connectionGeneration"
    | "lifeGeneration"
    | "participationGeneration"
    | "entityGeneration"
  )[],
): string[] {
  const conflicts: string[] = [];
  const byOwner = new Map<
    string,
    RuntimeEvidenceRecord[]
  >();

  for (const record of records) {
    const owner =
      record.scope?.[ownerKey];
    if (owner === undefined) continue;
    const bucket =
      byOwner.get(String(owner)) ?? [];
    bucket.push(record);
    byOwner.set(String(owner), bucket);
  }

  for (const [owner, bucket] of byOwner) {
    for (const generationKey of generationKeys) {
      const values = new Set(
        bucket
          .map((record) =>
            record.scope?.[
              generationKey
            ],
          )
          .filter(
            (value) =>
              value !== undefined,
          )
          .map(String),
      );

      if (values.size > 1) {
        conflicts.push(
          ownerKey +
            "=" +
            owner +
            " mixes " +
            generationKey +
            " values: " +
            [...values].sort().join(", ") +
            ".",
        );
      }
    }
  }

  return conflicts;
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

  const provenanceKeys = new Set(
    accepted
      .map((record) =>
        record.provenanceKey,
      )
      .filter(
        (value):
          value is string =>
          value !== undefined,
      ),
  );

  const conflicts = [
    ...ownerGenerationConflicts(
      accepted,
      "arenaId",
      ["arenaGeneration"],
    ),
    ...ownerGenerationConflicts(
      accepted,
      "playerKey",
      [
        "connectionGeneration",
        "lifeGeneration",
        "participationGeneration",
      ],
    ),
    ...ownerGenerationConflicts(
      accepted,
      "entityKey",
      ["entityGeneration"],
    ),
  ];

  const bootGenerations = new Set(
    accepted
      .map((record) =>
        record.scope?.bootGeneration,
      )
      .filter(
        (value) =>
          value !== undefined,
      )
      .map(String),
  );

  if (bootGenerations.size > 1) {
    conflicts.push(
      "Proof campaign mixes bootGeneration values: " +
        [...bootGenerations]
          .sort()
          .join(", ") +
        ".",
    );
  }

  if (
    contract.provenanceKey === undefined &&
    provenanceKeys.size > 1
  ) {
    conflicts.push(
      "Proof campaign mixes provenance keys: " +
        [...provenanceKeys]
          .sort()
          .join(", ") +
        ".",
    );
  }

  if (conflicts.length > 0) {
    return {
      status: "broken",
      acceptedRecords: accepted,
      rejectedRecords: rejected,
      reasons: [
        "Runtime evidence campaign mixes generation or provenance identity within the same owner.",
        ...conflicts.sort(),
      ],
    };
  }

  if (rejected.length > 0) {
    return {
      status: "broken",
      acceptedRecords: accepted,
      rejectedRecords: rejected,
      reasons: [
        "Runtime evidence campaign contains records from another profile, required scope, provenance campaign, or insufficient confidence.",
      ],
    };
  }

  return {
    status: "continuous",
    acceptedRecords: accepted,
    rejectedRecords: [],
    reasons: [
      "All runtime evidence records match the target profile and required scope, while each arena/player/entity owner keeps a stable generation identity.",
    ],
  };
}
