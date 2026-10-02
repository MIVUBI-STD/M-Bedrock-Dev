import type {
  GameplayIntentEvidence,
  GameplayIntentStatus,
} from "./types.js";

export type DesignIntentChallengeDisposition =
  | "grounded-design"
  | "implementation-only"
  | "ambiguous";

export interface DesignIntentChallengeInput {
  readonly implementationEvidenceIds: readonly string[];
  readonly independentDesignEvidenceIds: readonly string[];
  readonly playerFacingEvidenceIds?: readonly string[];
  readonly status?: GameplayIntentStatus;
}

export interface DesignIntentChallengeResult {
  readonly disposition: DesignIntentChallengeDisposition;
  readonly reasons: readonly string[];
  readonly evidenceIds: readonly string[];
}

export function challengeDesignIntent(
  input: DesignIntentChallengeInput,
): DesignIntentChallengeResult {
  const implementation = new Set(input.implementationEvidenceIds);
  const independent = [
    ...new Set(input.independentDesignEvidenceIds),
  ].filter((id) => !implementation.has(id));
  const playerFacing = [
    ...new Set(input.playerFacingEvidenceIds ?? []),
  ].filter((id) => !implementation.has(id));

  const evidenceIds = [
    ...new Set([
      ...input.implementationEvidenceIds,
      ...independent,
      ...playerFacing,
    ]),
  ].sort();

  if (independent.length > 0 || playerFacing.length > 0) {
    return {
      disposition: "grounded-design",
      reasons: [
        "Intended behavior has evidence independent from the implementation mechanism being audited.",
      ],
      evidenceIds,
    };
  }

  if (input.implementationEvidenceIds.length > 0) {
    return {
      disposition: "implementation-only",
      reasons: [
        "The behavior is enforced by implementation, but no independent selected-artifact evidence proves that the limitation is intended design.",
      ],
      evidenceIds,
    };
  }

  return {
    disposition: "ambiguous",
    reasons: [
      "Neither implementation behavior nor independent design intent is sufficiently grounded.",
    ],
    evidenceIds,
  };
}

export function selectedArtifactPlayerFacingEvidence(
  evidence: readonly GameplayIntentEvidence[],
): readonly string[] {
  return evidence
    .filter((item) =>
      item.scope === "selected-artifact" &&
      (
        item.origin === "dialogue" ||
        item.origin === "translation" ||
        item.origin === "structure" ||
        item.origin === "world-db" ||
        item.origin === "scoreboard" ||
        item.origin === "command"
      )
    )
    .map((item) => item.id)
    .sort();
}
