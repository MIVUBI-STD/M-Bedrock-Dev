import type {
  GameplayCausalLink,
  GameplayScenarioGraph,
} from "./gameplay-scenario-model.js";

export type GameplayDefectResolutionDisposition =
  | "CONFIRMED_DEFECT_READY"
  | "BLOCKING_COUNTERPROOF"
  | "RUNTIME_PROOF_REQUIRED"
  | "DETECTION_GAP"
  | "GAMEPLAY_TRANSLATION_REQUIRED"
  | "COUNTERPROOF_SEARCH_REQUIRED";

export interface GameplayDefectResolution {
  readonly causalLinkId: string;
  readonly scenarioId?: string;
  readonly knowledgeRequirementId?: string;
  readonly subjectIds?: readonly string[];
  readonly componentIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly disposition: GameplayDefectResolutionDisposition;
  readonly gameplayTrigger?: string;
  readonly gameplayConsequence?: string;
  readonly expectedOutcome?: string;
  readonly actualOutcome?: string;
  readonly affectedScope?: string;
  readonly counterProofEvidenceIds?: readonly string[];
  readonly runtimeReason?: string;
  readonly narrowRuntimeQuestion?: string;
  readonly detectionGapReason?: string;
  readonly missingCapability?: string;
}

export interface GameplayDefectResolutionGate {
  readonly status:
    | "READY_FOR_PROPOSED_BUG_SET"
    | "BLOCKED";
  readonly contradictedCausalLinkIds: readonly string[];
  readonly resolutions: readonly GameplayDefectResolution[];
  readonly confirmedDefectReadyIds: readonly string[];
  readonly blockingCounterProofIds: readonly string[];
  readonly runtimeProofRequiredIds: readonly string[];
  readonly detectionGapIds: readonly string[];
  readonly gameplayTranslationRequiredIds: readonly string[];
  readonly counterProofSearchRequiredIds: readonly string[];
  readonly issues: readonly string[];
}

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function unique(values: readonly string[] | undefined): readonly string[] {
  return [...new Set(
    (values ?? []).map((value) => value.trim()).filter(Boolean),
  )].sort();
}

function validateResolution(
  link: GameplayCausalLink,
  resolution: GameplayDefectResolution,
): readonly string[] {
  const issues: string[] = [];

  if (resolution.disposition === "CONFIRMED_DEFECT_READY") {
    if (!nonEmpty(resolution.gameplayTrigger)) {
      issues.push(link.id + ": confirmed defect requires gameplayTrigger.");
    }
    if (!nonEmpty(resolution.gameplayConsequence)) {
      issues.push(link.id + ": confirmed defect requires gameplayConsequence.");
    }
    if (!nonEmpty(resolution.expectedOutcome)) {
      issues.push(link.id + ": confirmed defect requires expectedOutcome.");
    }
    if (!nonEmpty(resolution.actualOutcome)) {
      issues.push(link.id + ": confirmed defect requires actualOutcome.");
    }
    if (!nonEmpty(resolution.affectedScope)) {
      issues.push(link.id + ": confirmed defect requires affectedScope.");
    }
  }

  if (resolution.disposition === "BLOCKING_COUNTERPROOF") {
    if (unique(resolution.counterProofEvidenceIds).length === 0) {
      issues.push(
        link.id +
          ": blocking counter-proof requires concrete counterProofEvidenceIds.",
      );
    }
  }

  if (resolution.disposition === "RUNTIME_PROOF_REQUIRED") {
    if (!nonEmpty(resolution.runtimeReason)) {
      issues.push(link.id + ": runtime proof requires runtimeReason.");
    }
    if (!nonEmpty(resolution.narrowRuntimeQuestion)) {
      issues.push(
        link.id +
          ": runtime proof requires one narrowRuntimeQuestion; do not emit a broad validation checklist.",
      );
    }
  }

  if (resolution.disposition === "DETECTION_GAP") {
    if (!nonEmpty(resolution.detectionGapReason)) {
      issues.push(link.id + ": detection gap requires detectionGapReason.");
    }
    if (!nonEmpty(resolution.missingCapability)) {
      issues.push(link.id + ": detection gap requires missingCapability.");
    }
  }

  return issues;
}

function overlapping(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const set = new Set(left);
  return right.some((item) => set.has(item));
}

function blockingCounterProofFor(
  graph: GameplayScenarioGraph,
  contradicted: GameplayCausalLink,
): readonly string[] {
  return graph.causalLinks
    .filter(
      (candidate) =>
        candidate.scenarioId === contradicted.scenarioId &&
        candidate.status === "PROVEN" &&
        candidate.intentEdgeKind === "excludes" &&
        (
          overlapping(
            candidate.subjectIds,
            contradicted.subjectIds,
          ) ||
          overlapping(
            candidate.componentIds,
            contradicted.componentIds,
          )
        ),
    )
    .flatMap((candidate) => candidate.evidenceIds)
    .filter(Boolean)
    .filter(
      (id, index, all) =>
        all.indexOf(id) === index,
    )
    .sort();
}

export function assessGameplayDefectResolutionGate(
  graph: GameplayScenarioGraph,
  suppliedResolutions: readonly GameplayDefectResolution[] = [],
): GameplayDefectResolutionGate {
  const contradicted = graph.causalLinks
    .filter((link) => link.status === "CONTRADICTED")
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  const contradictedIds = new Set(
    contradicted.map((link) => link.id),
  );
  const byId = new Map<string, GameplayDefectResolution>();
  const issues: string[] = [];

  for (const resolution of suppliedResolutions) {
    if (!contradictedIds.has(resolution.causalLinkId)) {
      issues.push(
        "Resolution references a causal link that is not currently CONTRADICTED: " +
          resolution.causalLinkId +
          ".",
      );
      continue;
    }
    if (byId.has(resolution.causalLinkId)) {
      issues.push(
        "Duplicate defect resolution for causal link: " +
          resolution.causalLinkId +
          ".",
      );
      continue;
    }
    byId.set(resolution.causalLinkId, resolution);
  }

  const resolutions: GameplayDefectResolution[] = contradicted.map((link) => {
    const supplied = byId.get(link.id);
    if (supplied) {
      issues.push(...validateResolution(link, supplied));
      return supplied;
    }

    const scenario = graph.scenarios.find(
      (item) => item.id === link.scenarioId,
    );
    const scope = [
      ...new Set([
        ...link.subjectIds,
        ...link.componentIds,
      ]),
    ].sort();

    const translationReady =
      scenario !== undefined &&
      link.purpose.trim().length > 0 &&
      link.reason.trim().length > 0 &&
      scope.length > 0 &&
      link.evidenceIds.length > 0;
    const blockingCounterProofEvidenceIds =
      blockingCounterProofFor(
        graph,
        link,
      );

    return {
      causalLinkId: link.id,
      scenarioId: link.scenarioId,
      ...(link.knowledgeRequirementId === undefined
        ? {}
        : {
            knowledgeRequirementId:
              link.knowledgeRequirementId,
          }),
      subjectIds: [...link.subjectIds],
      componentIds: [...link.componentIds],
      evidenceIds: [...link.evidenceIds],
      ...(blockingCounterProofEvidenceIds.length > 0
        ? {
            counterProofEvidenceIds:
              blockingCounterProofEvidenceIds,
            disposition:
              "BLOCKING_COUNTERPROOF" as const,
          }
        : translationReady
        ? {
            gameplayTrigger:
              scenario.purpose,
            gameplayConsequence:
              "A required dependency for " +
              scenario.label +
              " is contradicted, so the scenario can produce an incorrect or blocked player-visible result.",
            expectedOutcome:
              link.purpose,
            actualOutcome:
              link.reason,
            affectedScope:
              scope.join(", "),
            disposition:
              "COUNTERPROOF_SEARCH_REQUIRED" as const,
          }
        : {
            disposition:
              "GAMEPLAY_TRANSLATION_REQUIRED" as const,
          }),
    };
  });

  const idsFor = (
    disposition: GameplayDefectResolutionDisposition,
  ): readonly string[] =>
    resolutions
      .filter((item) => item.disposition === disposition)
      .map((item) => item.causalLinkId)
      .sort();

  const confirmedDefectReadyIds =
    idsFor("CONFIRMED_DEFECT_READY");
  const blockingCounterProofIds =
    idsFor("BLOCKING_COUNTERPROOF");
  const runtimeProofRequiredIds =
    idsFor("RUNTIME_PROOF_REQUIRED");
  const detectionGapIds =
    idsFor("DETECTION_GAP");
  const gameplayTranslationRequiredIds =
    idsFor("GAMEPLAY_TRANSLATION_REQUIRED");
  const counterProofSearchRequiredIds =
    idsFor("COUNTERPROOF_SEARCH_REQUIRED");

  if (gameplayTranslationRequiredIds.length > 0) {
    issues.push(
      "Gameplay translation is incomplete for contradicted causal links: " +
        gameplayTranslationRequiredIds.join(", ") +
        ". This is AI analysis work, not tester validation.",
    );
  }

  if (counterProofSearchRequiredIds.length > 0) {
    issues.push(
      "Blocking counter-proof search is incomplete for contradicted causal links: " +
        counterProofSearchRequiredIds.join(", ") +
        ". Complete the source-side search before report publication.",
    );
  }

  const malformedFinalResolution = resolutions.some((resolution) => {
    const link = contradicted.find(
      (candidate) => candidate.id === resolution.causalLinkId,
    );
    return link
      ? validateResolution(link, resolution).length > 0
      : true;
  });

  const status =
    gameplayTranslationRequiredIds.length === 0 &&
    counterProofSearchRequiredIds.length === 0 &&
    !malformedFinalResolution &&
    issues.every(
      (issue) =>
        !issue.startsWith("Duplicate defect resolution") &&
        !issue.startsWith("Resolution references"),
    )
      ? "READY_FOR_PROPOSED_BUG_SET" as const
      : "BLOCKED" as const;

  return {
    status,
    contradictedCausalLinkIds: contradicted.map((link) => link.id),
    resolutions,
    confirmedDefectReadyIds,
    blockingCounterProofIds,
    runtimeProofRequiredIds,
    detectionGapIds,
    gameplayTranslationRequiredIds,
    counterProofSearchRequiredIds,
    issues: [...new Set(issues)],
  };
}
