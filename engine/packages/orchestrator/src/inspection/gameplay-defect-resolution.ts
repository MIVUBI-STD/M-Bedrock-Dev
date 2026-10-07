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

export type CounterProofSearchDimension =
  | "owner"
  | "guard"
  | "generation"
  | "scope"
  | "cleanup"
  | "exclusion"
  | "geometry"
  | "capability"
  | "world-rule"
  | "activation"
  | "representation";

export interface CounterProofDimensionReceipt {
  readonly dimension: CounterProofSearchDimension;
  readonly scopeIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly exhaustiveWithinScope: boolean;
}

export interface CounterProofSearchReceipt {
  readonly schemaVersion: 1;
  readonly policy: "bounded-counterproof-search";
  readonly searchedDimensions:
    readonly CounterProofSearchDimension[];
  readonly dimensionReceipts:
    readonly CounterProofDimensionReceipt[];
  readonly scopeIds: readonly string[];
  readonly evidenceIds: readonly string[];
  readonly exhaustiveWithinScope: boolean;
  readonly conclusion:
    | "NO_BLOCKING_PROOF"
    | "BLOCKING_PROOF_FOUND";
}

export interface FamilyProofCriterionReceipt {
  readonly id: string;
  readonly satisfied: boolean;
  readonly evidenceIds: readonly string[];
}

export interface FamilyProofReceipt {
  readonly schemaVersion: 1;
  readonly policy: "family-proof-receipt";
  readonly failureDomain: string;
  readonly criteria: readonly FamilyProofCriterionReceipt[];
}

export interface GameplayDefectResolution {
  readonly causalLinkId: string;
  readonly scenarioId?: string;
  readonly knowledgeRequirementIds?: readonly string[];
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
  readonly counterProofSearch?: CounterProofSearchReceipt;
  readonly familyProof?: FamilyProofReceipt;
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

function requiredCounterProofDimensions(
  link: GameplayCausalLink,
  scenario:
    GameplayScenarioGraph["scenarios"][number] | undefined,
): readonly CounterProofSearchDimension[] {
  const required = new Set<CounterProofSearchDimension>([
    "guard",
    "scope",
    "exclusion",
  ]);
  const components = new Set(link.componentIds);
  const recoveryLike =
    scenario !== undefined &&
    /reconnect|reload|repeated|deferred|recovery|terminal/i.test(
      scenario.label + " " + scenario.gameplayStage,
    );
  const ownershipSensitive =
    [...components].some((id) =>
      id === "runtime:arena" ||
      id === "runtime:persistence" ||
      id === "runtime:chunks" ||
      id === "runtime:inventory"
    ) ||
    (scenario?.playerCounts.some((count) => count > 1) ?? false);
  if (ownershipSensitive) {
    required.add("owner");
  }
  if (
    recoveryLike ||
    [...components].some((id) =>
      id === "runtime:arena" ||
      id === "runtime:persistence" ||
      id === "runtime:chunks"
    )
  ) {
    required.add("generation");
    required.add("cleanup");
  }

  const scenarioText = [
    scenario?.label ?? "",
    scenario?.gameplayStage ?? "",
    scenario?.purpose ?? "",
    link.purpose,
    link.reason,
  ].join(" ");

  if (
    /escape|boundary|contain|flight|fly|path|travers|spatial|geometry|barrier|collision/i.test(
      scenarioText,
    )
  ) {
    required.add("geometry");
  }

  if (
    /admin|roommaster|operator|permission|creative|spectator|capabilit|privileg|spawn.?egg|manual.?spawn/i.test(
      scenarioText,
    )
  ) {
    required.add("capability");
    required.add("activation");
  }

  if (
    /gamerule|natural.?spawn|mob.?spawn|weather|daylight|world.?setting/i.test(
      scenarioText,
    )
  ) {
    required.add("world-rule");
  }

  if (
    /client|visual|waterlog|prediction|desync|ghost|render|reconcil/i.test(
      scenarioText,
    )
  ) {
    required.add("representation");
  }

  return [...required].sort();
}

function validateResolution(
  link: GameplayCausalLink,
  resolution: GameplayDefectResolution,
  scenario:
    GameplayScenarioGraph["scenarios"][number] | undefined,
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
    const search = resolution.counterProofSearch;
    if (search === undefined) {
      issues.push(
        link.id +
          ": confirmed defect requires CounterProofSearchReceipt.",
      );
    } else {
      if (
        search.schemaVersion !== 1 ||
        search.policy !== "bounded-counterproof-search"
      ) {
        issues.push(
          link.id +
            ": counter-proof search receipt has unsupported schema/policy.",
        );
      }
      const searchedDimensions =
        unique(search.searchedDimensions) as readonly CounterProofSearchDimension[];
      if (searchedDimensions.length === 0) {
        issues.push(
          link.id +
            ": counter-proof search must record searched dimensions.",
        );
      }
      const dimensionReceipts =
        search.dimensionReceipts ?? [];
      for (const dimension of searchedDimensions) {
        const receipt = dimensionReceipts.find(
          (item) => item.dimension === dimension,
        );
        if (
          receipt === undefined ||
          unique(receipt.scopeIds).length === 0 ||
          unique(receipt.evidenceIds).length === 0
        ) {
          issues.push(
            link.id +
              ": counter-proof dimension '" +
              dimension +
              "' requires explicit scope/evidence receipt.",
          );
        }
      }
      const requiredDimensions =
        requiredCounterProofDimensions(
          link,
          scenario,
        );
      const missingDimensions =
        requiredDimensions.filter(
          (dimension) =>
            !searchedDimensions.includes(dimension),
        );
      if (missingDimensions.length > 0) {
        issues.push(
          link.id +
            ": counter-proof search is incomplete; missing relevant dimensions: " +
            missingDimensions.join(", ") +
            ".",
        );
      }
      if (unique(search.scopeIds).length === 0) {
        issues.push(
          link.id +
            ": counter-proof search must bind the searched gameplay/source scope.",
        );
      }
      if (unique(search.evidenceIds).length === 0) {
        issues.push(
          link.id +
            ": counter-proof search must include coverage evidence.",
        );
      }
      if (!search.exhaustiveWithinScope) {
        issues.push(
          link.id +
            ": confirmed defect requires counter-proof search exhaustion within the bounded scope.",
        );
      }
      if (search.conclusion !== "NO_BLOCKING_PROOF") {
        issues.push(
          link.id +
            ": confirmed defect requires NO_BLOCKING_PROOF conclusion.",
        );
      }
    }
  }

  if (resolution.disposition === "BLOCKING_COUNTERPROOF") {
    if (unique(resolution.counterProofEvidenceIds).length === 0) {
      issues.push(
        link.id +
          ": blocking counter-proof requires concrete counterProofEvidenceIds.",
      );
    }
    if (
      resolution.counterProofSearch !== undefined &&
      resolution.counterProofSearch.conclusion !==
        "BLOCKING_PROOF_FOUND"
    ) {
      issues.push(
        link.id +
          ": blocking counter-proof search receipt must conclude BLOCKING_PROOF_FOUND.",
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

function dimensionScopeClosed(
  graph: GameplayScenarioGraph,
  contradicted: GameplayCausalLink,
  dimension: CounterProofSearchDimension,
): boolean {
  const evidenceIds = dimensionEvidenceFor(
    graph,
    contradicted,
    dimension,
  );
  if (evidenceIds.length === 0) return false;

  const relevant = graph.causalLinks.filter(
    (candidate) =>
      candidate.scenarioId === contradicted.scenarioId &&
      (
        candidate.id === contradicted.id ||
        overlapping(candidate.subjectIds, contradicted.subjectIds) ||
        overlapping(candidate.componentIds, contradicted.componentIds)
      ) &&
      (
        candidate.id === contradicted.id ||
        (candidate.dimensionEvidence[dimension]?.length ?? 0) > 0
      ),
  );
  if (relevant.length === 0) return false;
  return relevant.every(
    (candidate) =>
      candidate.evidenceIds.length > 0 &&
      candidate.status !== "DETECTION_GAP" &&
      candidate.status !== "RUNTIME_BLOCKED",
  );
}

function dimensionEvidenceFor(
  graph: GameplayScenarioGraph,
  contradicted: GameplayCausalLink,
  dimension: CounterProofSearchDimension,
): readonly string[] {
  const scoped = graph.causalLinks.filter(
    (candidate) =>
      candidate.scenarioId === contradicted.scenarioId &&
      (
        candidate.id === contradicted.id ||
        overlapping(candidate.subjectIds, contradicted.subjectIds) ||
        overlapping(candidate.componentIds, contradicted.componentIds)
      ),
  );

  const componentHints: Readonly<Record<CounterProofSearchDimension, readonly string[]>> = {
    owner: ["runtime:arena", "runtime:persistence", "runtime:inventory", "runtime:state"],
    guard: [],
    generation: ["runtime:arena", "runtime:persistence"],
    scope: [],
    cleanup: ["runtime:arena-cleanup", "runtime:structures", "runtime:inventory"],
    exclusion: [],
    geometry: ["runtime:spatial", "runtime:structures", "runtime:arena-replica-integrity"],
    capability: ["runtime:player-capability"],
    "world-rule": ["runtime:world-rules"],
    activation: ["runtime:player-capability"],
    representation: ["runtime:client-reconciliation"],
  };
  const hints = componentHints[dimension];
  const directDimensionEvidence =
    contradicted.dimensionEvidence[dimension] ?? [];

  return [
    ...new Set([
      ...directDimensionEvidence,
      ...scoped
        .filter(
          (candidate) =>
            hints.length === 0 ||
            candidate.componentIds.some((id) =>
              hints.includes(id)
            ),
        )
        .flatMap((candidate) => [
          ...candidate.evidenceIds,
          ...(candidate.dimensionEvidence[dimension] ?? []),
        ])
        .filter(Boolean),
    ]),
  ].sort();
}

function automaticCounterProofSearch(
  graph: GameplayScenarioGraph,
  contradicted: GameplayCausalLink,
  scenario:
    GameplayScenarioGraph["scenarios"][number] | undefined,
): CounterProofSearchReceipt {
  const requiredDimensions =
    requiredCounterProofDimensions(
      contradicted,
      scenario,
    );
  const automaticallySearchable =
    requiredDimensions.filter((dimension) =>
      dimension === "guard" ||
      dimension === "scope" ||
      dimension === "exclusion" ||
      dimensionEvidenceFor(
        graph,
        contradicted,
        dimension,
      ).length > 0
    );
  const scopeIds = [
    ...new Set([
      ...contradicted.subjectIds,
      ...contradicted.componentIds,
    ]),
  ].sort();

  const scopedLinks = graph.causalLinks.filter(
    (candidate) =>
      candidate.scenarioId === contradicted.scenarioId &&
      (
        candidate.id === contradicted.id ||
        overlapping(candidate.subjectIds, scopeIds) ||
        overlapping(candidate.componentIds, scopeIds)
      ),
  );

  const blocking = blockingCounterProofFor(
    graph,
    contradicted,
  );

  const evidenceIds = [
    ...new Set([
      ...contradicted.evidenceIds,
      ...scopedLinks.flatMap((candidate) =>
        candidate.evidenceIds
      ),
    ]),
  ].filter(Boolean).sort();

  return {
    schemaVersion: 1,
    policy: "bounded-counterproof-search",
    searchedDimensions: automaticallySearchable,
    dimensionReceipts:
      automaticallySearchable.map((dimension) => {
        const dimensionEvidence =
          dimensionEvidenceFor(
            graph,
            contradicted,
            dimension,
          );
        return {
          dimension,
          scopeIds,
          evidenceIds:
            dimensionEvidence.length > 0
              ? dimensionEvidence
              : evidenceIds,
          exhaustiveWithinScope:
            dimensionScopeClosed(
              graph,
              contradicted,
              dimension,
            ),
        };
      }),
    scopeIds,
    evidenceIds,
    // This receipt is exhaustive only within the already-closed selected-
    // artifact scenario graph. Runtime-unknown semantics never reach this
    // branch as a source-confirmed contradiction; they remain RUNTIME_BLOCKED
    // or DETECTION_GAP with targeted test obligations.
    exhaustiveWithinScope:
      requiredDimensions.every((dimension) =>
        automaticallySearchable.includes(dimension) &&
        dimensionScopeClosed(
          graph,
          contradicted,
          dimension,
        )
      ),
    conclusion:
      blocking.length > 0
        ? "BLOCKING_PROOF_FOUND"
        : "NO_BLOCKING_PROOF",
  };
}

function counterProofAppliesAtCommit(
  candidate: GameplayCausalLink,
  contradicted: GameplayCausalLink,
): boolean {
  if (
    candidate.scenarioId !== contradicted.scenarioId ||
    candidate.status !== "PROVEN" ||
    candidate.intentEdgeKind !== "excludes" ||
    candidate.evidenceIds.length === 0
  ) {
    return false;
  }

  const exactTarget =
    candidate.toComponentId ===
      contradicted.toComponentId;
  const exactDependency =
    candidate.fromComponentId ===
      contradicted.fromComponentId &&
    candidate.toComponentId ===
      contradicted.toComponentId;
  const sameSubjectAtTarget =
    exactTarget &&
    overlapping(
      candidate.subjectIds,
      contradicted.subjectIds,
    );

  return (
    exactDependency ||
    sameSubjectAtTarget
  );
}

function blockingCounterProofFor(
  graph: GameplayScenarioGraph,
  contradicted: GameplayCausalLink,
): readonly string[] {
  return graph.causalLinks
    .filter((candidate) =>
      counterProofAppliesAtCommit(
        candidate,
        contradicted,
      )
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
      const scenario = graph.scenarios.find(
        (item) => item.id === link.scenarioId,
      );
      issues.push(
        ...validateResolution(
          link,
          supplied,
          scenario,
        ),
      );
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

    const impactPathLabels = link.impactPathComponentIds.map((id) => graph.components.find((component) => component.id === id)?.label ?? id);
    const propagatedConsequence = impactPathLabels.length > 0 ? "Dependency impact path: " + impactPathLabels.join(" -> ") + "." : undefined;
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
    const automaticSearch =
      automaticCounterProofSearch(
        graph,
        link,
        scenario,
      );
    const requiredDimensions =
      requiredCounterProofDimensions(
        link,
        scenario,
      );
    const missingAutomaticDimensions =
      requiredDimensions.filter(
        (dimension) =>
          !automaticSearch.searchedDimensions.includes(
            dimension,
          ),
      );

    return {
      causalLinkId: link.id,
      scenarioId: link.scenarioId,
      ...(link.knowledgeRequirementIds.length === 0
        ? {}
        : {
            knowledgeRequirementIds:
              [...link.knowledgeRequirementIds],
          }),
      subjectIds: [...link.subjectIds],
      componentIds: [...link.componentIds],
      evidenceIds: [...link.evidenceIds],
      ...(blockingCounterProofEvidenceIds.length > 0
        ? {
            counterProofEvidenceIds:
              blockingCounterProofEvidenceIds,
            counterProofSearch:
              automaticSearch,
            disposition:
              "BLOCKING_COUNTERPROOF" as const,
          }
        : translationReady
        ? missingAutomaticDimensions.length > 0
          ? {
              gameplayTrigger:
                scenario.purpose,
              gameplayConsequence:
                "A required dependency for " +
                scenario.label +
                " is contradicted, but sensitive counter-proof dimensions remain unresolved.",
              expectedOutcome:
                link.purpose,
              actualOutcome:
                link.reason,
              affectedScope:
                scope.join(", "),
              counterProofSearch:
                automaticSearch,
              disposition:
                "COUNTERPROOF_SEARCH_REQUIRED" as const,
            }
          : {
              gameplayTrigger:
                scenario.purpose,
              gameplayConsequence:
                propagatedConsequence ?? ("A required dependency for " + scenario.label + " is contradicted, so the scenario can produce an incorrect or blocked player-visible result."),
              expectedOutcome:
                link.purpose,
              actualOutcome:
                link.reason,
              affectedScope:
                scope.join(", "),
              counterProofSearch:
                automaticSearch,
              disposition:
                "CONFIRMED_DEFECT_READY" as const,
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
    if (!link) return true;
    const scenario = graph.scenarios.find(
      (item) => item.id === link.scenarioId,
    );
    return validateResolution(
      link,
      resolution,
      scenario,
    ).length > 0;
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
