export type FullMapReplicaStatus =
  | "EQUIVALENT"
  | "EXPECTED_VARIANT"
  | "MATERIAL_DIVERGENCE"
  | "INCOMPLETE_PROOF";

export interface FullMapReplicaResult {
  readonly replicaId: string;
  readonly replicaStatus: FullMapReplicaStatus;
  readonly materialDeltaIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly reason: string;
}

export interface FullMapReplicaReceipt {
  readonly policy: "full-map-baseline-delta";
  readonly replicaBaseline: string;
  readonly replicaResults: readonly FullMapReplicaResult[];
  readonly materialDeltaIds: readonly string[];
  readonly incompleteReplicaIds: readonly string[];
  readonly baselineReusableForAllReplicas: boolean;
}

/**
 * Consolidates existing replica proof into one readable baseline/delta receipt.
 * It does not perform new world comparison and therefore cannot become a
 * second replica analyzer.
 */
export function buildFullMapReplicaReceipt(input: {
  readonly replicaBaseline: string;
  readonly replicas: readonly {
    readonly replicaId: string;
    readonly proofStatus:
      | "complete-proof"
      | "bounded-proof"
      | "diverged"
      | "incomplete-proof"
      | "budget-exceeded"
      | "no-proof";
    readonly mismatchCount: number;
    readonly evidenceIds?: readonly string[];
    readonly expectedVariant?: boolean;
  }[];
}): FullMapReplicaReceipt {
  const replicaResults: FullMapReplicaResult[] =
    input.replicas.map((replica) => {
      const incomplete =
        replica.proofStatus === "incomplete-proof" ||
        replica.proofStatus === "budget-exceeded" ||
        replica.proofStatus === "no-proof";
      const diverged =
        replica.proofStatus === "diverged" ||
        replica.mismatchCount > 0;
      const replicaStatus: FullMapReplicaStatus =
        incomplete
          ? "INCOMPLETE_PROOF"
          : replica.expectedVariant
            ? "EXPECTED_VARIANT"
            : diverged
              ? "MATERIAL_DIVERGENCE"
              : "EQUIVALENT";

      return {
        replicaId: replica.replicaId,
        replicaStatus,
        materialDeltaIds:
          replicaStatus === "MATERIAL_DIVERGENCE"
            ? [
                "replica-delta:" +
                  replica.replicaId,
              ]
            : [],
        evidenceIds: [
          ...(replica.evidenceIds ?? []),
        ],
        reason:
          replicaStatus === "EQUIVALENT"
            ? "Replica proof is sufficient and no material divergence is present."
            : replicaStatus === "EXPECTED_VARIANT"
              ? "Replica differs only through an explicitly expected variant."
              : replicaStatus === "MATERIAL_DIVERGENCE"
                ? "Replica contains one or more material world/topology differences that must continue to causal analysis."
                : "Replica proof is incomplete and baseline safety cannot be inherited.",
      };
    });

  const materialDeltaIds = [
    ...new Set(
      replicaResults.flatMap(
        (item) => item.materialDeltaIds,
      ),
    ),
  ].sort();
  const incompleteReplicaIds =
    replicaResults
      .filter(
        (item) =>
          item.replicaStatus ===
          "INCOMPLETE_PROOF",
      )
      .map((item) => item.replicaId)
      .sort();

  return {
    policy: "full-map-baseline-delta",
    replicaBaseline: input.replicaBaseline,
    replicaResults: replicaResults.sort(
      (a, b) =>
        a.replicaId.localeCompare(b.replicaId),
    ),
    materialDeltaIds,
    incompleteReplicaIds,
    baselineReusableForAllReplicas:
      incompleteReplicaIds.length === 0 &&
      materialDeltaIds.length === 0,
  };
}
