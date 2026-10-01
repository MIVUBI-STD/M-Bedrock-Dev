import {
  assessGameplayDesignReadiness,
  type GameplayDesignReadinessResult,
} from "./design-readiness.js";
import {
  independentGameplayIntentEvidenceIds,
} from "./authority.js";
import type {
  GameplayIntentModel,
} from "./types.js";

export interface GameplayContractBuildInput {
  readonly subjectIds: readonly string[];
  readonly designRuleEvidenceIds?: readonly string[];
  readonly materialUnknownIds?: readonly string[];
  readonly nonMaterialUnknownIds?: readonly string[];
}

export interface GameplayContract {
  readonly schemaVersion: 1;
  readonly modelId: string;
  readonly subjectIds: readonly string[];
  readonly invariantIds: readonly string[];
  readonly authorityEvidenceIds: readonly string[];
  readonly readiness: GameplayDesignReadinessResult;
}

export function buildGameplayContract(
  model: GameplayIntentModel,
  input: GameplayContractBuildInput,
): GameplayContract {
  const subjects = new Set(input.subjectIds);
  const invariantIds = model.invariants
    .filter((invariant) =>
      invariant.subjectIds.some((subjectId) =>
        subjects.has(subjectId),
      ),
    )
    .map((invariant) => invariant.id)
    .sort();

  const authorityEvidenceIds = [
    ...new Set([
      ...independentGameplayIntentEvidenceIds(
        model,
        invariantIds,
      ),
      ...(input.designRuleEvidenceIds ?? []),
    ]),
  ]
    .filter((id) => id.trim().length > 0)
    .sort();

  const readiness = assessGameplayDesignReadiness(
    model,
    {
      scopeSubjectIds: [...input.subjectIds],
      authoritativeDesignAvailable:
        authorityEvidenceIds.length > 0,
      ...(input.materialUnknownIds === undefined
        ? {}
        : {
            materialUnknownIds:
              input.materialUnknownIds,
          }),
      ...(input.nonMaterialUnknownIds === undefined
        ? {}
        : {
            nonMaterialUnknownIds:
              input.nonMaterialUnknownIds,
          }),
    },
  );

  return {
    schemaVersion: 1,
    modelId: model.id,
    subjectIds: [...input.subjectIds],
    invariantIds,
    authorityEvidenceIds,
    readiness,
  };
}
