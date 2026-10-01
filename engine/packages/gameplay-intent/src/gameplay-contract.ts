import {
  assessGameplayDesignReadiness,
  type GameplayDesignReadinessResult,
} from "./design-readiness.js";
import {
  selectedArtifactGameplayContractEvidenceIds,
} from "./authority.js";
import type {
  GameplayIntentModel,
} from "./types.js";

export interface GameplayContractBuildInput {
  readonly subjectIds: readonly string[];
  readonly materialUnknownIds?: readonly string[];
  readonly nonMaterialUnknownIds?: readonly string[];
}

export interface GameplayContract {
  readonly schemaVersion: 1;
  readonly modelId: string;
  readonly artifactId?: string;
  readonly evidenceScope: "selected-artifact-only";
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

  const authorityEvidenceIds =
    selectedArtifactGameplayContractEvidenceIds(
      model,
      invariantIds,
    );

  const readiness = assessGameplayDesignReadiness(
    model,
    {
      scopeSubjectIds: [...input.subjectIds],
      authoritativeDesignAvailable:
        model.artifactId !== undefined &&
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
    ...(model.artifactId === undefined
      ? {}
      : { artifactId: model.artifactId }),
    evidenceScope: "selected-artifact-only",
    subjectIds: [...input.subjectIds],
    invariantIds,
    authorityEvidenceIds,
    readiness,
  };
}
