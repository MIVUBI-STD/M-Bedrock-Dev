import type {
  GameplayIntentModel,
} from "./types.js";

export type GameplayDesignReadiness =
  | "ready"
  | "partial"
  | "blocked";

export interface GameplayDesignReadinessInput {
  readonly scopeSubjectIds: readonly string[];
  readonly materialUnknownIds?: readonly string[];
  readonly nonMaterialUnknownIds?: readonly string[];
}

export interface GameplayDesignReadinessResult {
  readonly disposition: GameplayDesignReadiness;
  readonly scopeSubjectIds: readonly string[];
  readonly blockingUnknownIds: readonly string[];
  readonly toleratedUnknownIds: readonly string[];
  readonly reasons: readonly string[];
}

export function assessGameplayDesignReadiness(
  model: GameplayIntentModel,
  input: GameplayDesignReadinessInput,
): GameplayDesignReadinessResult {
  const scoped = new Set(input.scopeSubjectIds);
  const requestedBlocking = new Set(
    input.materialUnknownIds ?? [],
  );
  const requestedTolerated = new Set(
    input.nonMaterialUnknownIds ?? [],
  );

  const relevantUnknowns = model.unknowns.filter((unknown) =>
    unknown.blockedSubjectIds.some((subjectId) =>
      scoped.has(subjectId),
    ),
  );

  const blockingUnknownIds = relevantUnknowns
    .filter((unknown) =>
      requestedBlocking.has(unknown.id) ||
      (
        !requestedTolerated.has(unknown.id) &&
        requestedBlocking.size === 0
      )
    )
    .map((unknown) => unknown.id)
    .sort();

  const toleratedUnknownIds = relevantUnknowns
    .filter((unknown) =>
      requestedTolerated.has(unknown.id),
    )
    .map((unknown) => unknown.id)
    .sort();

  if (blockingUnknownIds.length > 0) {
    return {
      disposition: "blocked",
      scopeSubjectIds: [...input.scopeSubjectIds],
      blockingUnknownIds,
      toleratedUnknownIds,
      reasons: [
        "Material Game Design unknowns can change bug-vs-feature classification for this scope.",
      ],
    };
  }

  if (toleratedUnknownIds.length > 0) {
    return {
      disposition: "partial",
      scopeSubjectIds: [...input.scopeSubjectIds],
      blockingUnknownIds: [],
      toleratedUnknownIds,
      reasons: [
        "Unresolved design questions exist, but they are explicitly non-material for this scoped decision.",
      ],
    };
  }

  return {
    disposition: "ready",
    scopeSubjectIds: [...input.scopeSubjectIds],
    blockingUnknownIds: [],
    toleratedUnknownIds: [],
    reasons: [
      "No material Game Design unknown blocks this scoped decision.",
    ],
  };
}
