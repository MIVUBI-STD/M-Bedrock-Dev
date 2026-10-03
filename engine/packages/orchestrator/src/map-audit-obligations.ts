import type {
  GameplayModelClosureResult,
} from "../../gameplay-intent/src/index.js";
import type {
  NegativeSpaceSignal,
  TemporalInteractionRisk,
} from "../../diagnostic-reasoning/src/index.js";
import type {
  GameplayScenarioGraph,
} from "./inspection/gameplay-scenario-model.js";
import type {
  GameplayDefectResolutionGate,
} from "./inspection/gameplay-defect-resolution.js";
import type {
  GameplayWorldModel,
} from "./inspection/gameplay-world-model.js";
import type {
  AuditUserIntentEnvelope,
} from "./map-audit-user-intent.js";
import type {
  GameplayDiscoveryChallengeSignal,
} from "./inspection/gameplay-discovery-challenger.js";
import type {
  SharedResourceOwnershipSignal,
} from "./inspection/shared-resource-ownership.js";
import type {
  AccumulationGrowthSignal,
  CompoundBoundarySignal,
} from "./inspection/gameplay-compound-growth-analysis.js";

export type AuditObligationSource =
  | "knowledge-gap"
  | "scenario-coverage"
  | "graph-structure"
  | "gameplay-closure"
  | "negative-space"
  | "temporal-risk"
  | "discovery-challenge"
  | "shared-resource"
  | "compound-boundary"
  | "accumulation-growth"
  | "replica-divergence"
  | "runtime-proof"
  | "detection-gap"
  | "gameplay-translation"
  | "counterproof-search"
  | "user-reported-symptom";

export interface AuditObligation {
  readonly id: string;
  readonly source: AuditObligationSource;
  readonly stage:
    | "DISCOVERY"
    | "UNDERSTAND"
    | "MODEL"
    | "STRESS"
    | "PROVE";
  readonly title: string;
  readonly reason: string;
  readonly missingProof: string;
  readonly validationTest: string;
  readonly validationGroupKey: string;
  readonly subjectIds: readonly string[];
  readonly componentIds: readonly string[];
  readonly evidenceIds: readonly string[];
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function normalize(
  value: AuditObligation,
): AuditObligation {
  return {
    ...value,
    subjectIds: unique(value.subjectIds),
    componentIds: unique(value.componentIds),
    evidenceIds: unique(value.evidenceIds),
  };
}

function graphObligations(
  graph: GameplayScenarioGraph,
): AuditObligation[] {
  const items: AuditObligation[] = [];

  for (const link of graph.causalLinks) {
    if (
      link.status !== "RUNTIME_BLOCKED" &&
      link.status !== "DETECTION_GAP"
    ) {
      continue;
    }
    const scenario = graph.scenarios.find(
      (item) => item.id === link.scenarioId,
    );
    items.push(normalize({
      id: link.id,
      source:
        link.status === "RUNTIME_BLOCKED"
          ? "runtime-proof"
          : "detection-gap",
      stage:
        link.status === "RUNTIME_BLOCKED"
          ? "PROVE"
          : "UNDERSTAND",
      title:
        link.status === "RUNTIME_BLOCKED"
          ? "Resolve runtime-dependent gameplay evidence"
          : "Resolve gameplay detection gap",
      reason: link.reason,
      missingProof:
        link.status === "RUNTIME_BLOCKED"
          ? "One narrow deciding runtime observation for the unresolved gameplay dependency."
          : "Selected-artifact semantic evidence sufficient to understand and causally classify the gameplay dependency.",
      validationTest:
        link.status === "RUNTIME_BLOCKED"
          ? "Run only the narrow unresolved runtime dependency for scenario '" +
            (scenario?.label ?? link.scenarioId) +
            "'. Promote to a finding only if the observation proves a wrong player-visible outcome."
          : "Resolve the semantic owner and gameplay effect for this dependency, then rerun causal contradiction analysis before issue classification.",
      validationGroupKey:
        (scenario?.id ?? link.scenarioId) +
        ":" +
        (
          link.status === "RUNTIME_BLOCKED"
            ? "runtime-proof"
            : "detection-gap"
        ),
      subjectIds: link.subjectIds,
      componentIds: link.componentIds,
      evidenceIds: link.evidenceIds,
    }));
  }

  for (const receipt of graph.knowledgeReceipts) {
    if (receipt.status === "SATISFIED") continue;
    const requirement = graph.knowledgeRequirements.find(
      (item) => item.id === receipt.requirementId,
    );
    const scenario = graph.scenarios.find(
      (item) => item.id === receipt.scenarioId,
    );
    if (!requirement || !scenario) continue;

    items.push(normalize({
      id: "knowledge-gap:" + receipt.requirementId,
      source: "knowledge-gap",
      stage: "PROVE",
      title:
        "Resolve required " + requirement.domain + " knowledge",
      reason: receipt.reason,
      missingProof:
        "Scenario-scoped " +
        requirement.domain +
        " evidence sufficient to decide the required gameplay dependency.",
      validationTest:
        "Resolve the " +
        requirement.domain +
        " dependency for scenario '" +
        scenario.label +
        "' before classifying any gameplay issue.",
      validationGroupKey:
        scenario.id + ":" + requirement.domain,
      subjectIds: [
        ...requirement.subjectIds,
        ...receipt.subjectIds,
      ],
      componentIds: [
        ...requirement.componentIds,
        ...receipt.componentIds,
      ],
      evidenceIds: receipt.evidenceIds,
    }));
  }

  for (const scenario of graph.scenarios) {
    if (
      scenario.composedScenarioIds.length === 0 &&
      scenario.componentIds.length > 0 &&
      scenario.causalLinkIds.length === 0
    ) {
      items.push(normalize({
        id: "shallow-scenario:" + scenario.id,
        source: "scenario-coverage",
        stage: "UNDERSTAND",
        title:
          "Ground causal dependencies for " + scenario.label,
        reason:
          "The gameplay scenario has selected-artifact components but no causal proof edge.",
        missingProof:
          "At least one scenario-scoped causal dependency and deciding evidence.",
        validationTest:
          "Trace scenario '" +
          scenario.label +
          "' through success and failure exits and bind every required transition to causal evidence.",
        validationGroupKey:
          scenario.id + ":scenario-closure",
        subjectIds: scenario.sourceSubjectIds,
        componentIds: scenario.componentIds,
        evidenceIds: [],
      }));
    }

    if (
      scenario.composedScenarioIds.length === 0 &&
      scenario.componentIds.length === 0
    ) {
      items.push(normalize({
        id: "scenario-without-components:" + scenario.id,
        source: "graph-structure",
        stage: "UNDERSTAND",
        title:
          "Bind scenario to selected-artifact components",
        reason:
          "The gameplay scenario exists without concrete selected-artifact component binding.",
        missingProof:
          "Selected-artifact scripts/functions/entities/state implementing the scenario.",
        validationTest:
          "Trace scenario '" +
          scenario.label +
          "' to the concrete selected-artifact components that implement it.",
        validationGroupKey:
          "scenario-components:" + scenario.id,
        subjectIds: scenario.sourceSubjectIds,
        componentIds: [],
        evidenceIds: [],
      }));
    }
  }

  const scenarioIds = new Set(
    graph.scenarios.map((item) => item.id),
  );
  for (const scenario of graph.scenarios) {
    const missingChildren =
      scenario.composedScenarioIds.filter(
        (id) => !scenarioIds.has(id),
      );
    if (missingChildren.length === 0) continue;
    items.push(normalize({
      id: "incomplete-composition:" + scenario.id,
      source: "graph-structure",
      stage: "UNDERSTAND",
      title:
        "Complete scenario composition for " + scenario.label,
      reason:
        "Composed gameplay references missing child scenario(s): " +
        missingChildren.sort().join(", ") +
        ".",
      missingProof:
        "Concrete child-scenario coverage for every composed path.",
      validationTest:
        "Trace the composed gameplay flow for '" +
        scenario.label +
        "' and account for each missing child path before issue classification.",
      validationGroupKey:
        "scenario-composition:" + scenario.id,
      subjectIds: scenario.sourceSubjectIds,
      componentIds: scenario.componentIds,
      evidenceIds: [],
    }));
  }

  for (const component of graph.components) {
    if (!component.orphan && component.gameplayPurpose.trim()) {
      continue;
    }
    const orphan = component.orphan;
    items.push(normalize({
      id:
        (orphan
          ? "orphan-component:"
          : "missing-purpose:") +
        component.id,
      source: "graph-structure",
      stage: "DISCOVERY",
      title:
        orphan
          ? "Resolve orphan component " + component.label
          : "Ground gameplay purpose for " + component.label,
      reason:
        orphan
          ? "Component is not correlated to any material gameplay scenario."
          : "Component has no grounded gameplay purpose.",
      missingProof:
        "Concrete gameplay purpose, semantic owner, and scenario dependency.",
      validationTest:
        "Trace " +
        component.label +
        " from selected-artifact execution/state evidence to its observable gameplay role. Do not classify it as a bug unless a causal gameplay contradiction is established.",
      validationGroupKey:
        "component-coverage:" + component.id,
      subjectIds: [component.id],
      componentIds: [component.id],
      evidenceIds: component.evidenceIds,
    }));
  }

  return items;
}

function resolutionObligations(
  graph: GameplayScenarioGraph,
  gate: GameplayDefectResolutionGate,
): AuditObligation[] {
  const items: AuditObligation[] = [];

  for (const resolution of gate.resolutions) {
    if (
      resolution.disposition !== "GAMEPLAY_TRANSLATION_REQUIRED" &&
      resolution.disposition !== "COUNTERPROOF_SEARCH_REQUIRED" &&
      resolution.disposition !== "RUNTIME_PROOF_REQUIRED" &&
      resolution.disposition !== "DETECTION_GAP"
    ) {
      continue;
    }

    const link = graph.causalLinks.find(
      (item) => item.id === resolution.causalLinkId,
    );
    if (!link) continue;
    const scenario = graph.scenarios.find(
      (item) => item.id === link.scenarioId,
    );
    const label =
      scenario?.label ?? link.scenarioId;

    if (
      resolution.disposition ===
      "GAMEPLAY_TRANSLATION_REQUIRED"
    ) {
      items.push(normalize({
        id: resolution.causalLinkId,
        source: "gameplay-translation",
        stage: "PROVE",
        title:
          "Translate technical contradiction into gameplay impact",
        reason:
          "A source contradiction exists, but its player-visible defect contract is incomplete.",
        missingProof:
          "Concrete trigger, expected outcome, actual outcome, player-visible consequence, and affected scope.",
        validationTest:
          "Translate the contradicted dependency for scenario '" +
          label +
          "' using selected-artifact evidence. This is analysis work, not a tester bug claim.",
        validationGroupKey:
          label + ":gameplay-translation",
        subjectIds: link.subjectIds,
        componentIds: link.componentIds,
        evidenceIds: [
          ...link.evidenceIds,
          ...(resolution.evidenceIds ?? []),
        ],
      }));
      continue;
    }

    if (
      resolution.disposition ===
      "COUNTERPROOF_SEARCH_REQUIRED"
    ) {
      items.push(normalize({
        id: resolution.causalLinkId,
        source: "counterproof-search",
        stage: "PROVE",
        title: "Complete blocking counter-proof search",
        reason:
          "A translated contradiction exists, but a reachable guard/owner/scope/generation/cleanup/exclusion may still prevent the wrong state.",
        missingProof:
          "Bounded exhaustive counter-proof receipt for the exact contradicted commit/dependency.",
        validationTest:
          "Search only the exact contradicted dependency for blocking guard, scope, exclusion, owner, generation, and cleanup proof. Promote only after the search is exhaustive and returns NO_BLOCKING_PROOF.",
        validationGroupKey:
          label + ":counterproof",
        subjectIds: link.subjectIds,
        componentIds: link.componentIds,
        evidenceIds: [
          ...link.evidenceIds,
          ...(resolution.evidenceIds ?? []),
        ],
      }));
      continue;
    }

    if (
      resolution.disposition ===
      "RUNTIME_PROOF_REQUIRED"
    ) {
      items.push(normalize({
        id: resolution.causalLinkId,
        source: "runtime-proof",
        stage: "PROVE",
        title: "Resolve irreducible runtime behavior",
        reason:
          resolution.runtimeReason ??
          "The dependency cannot be decided safely from static/package evidence.",
        missingProof:
          "One narrow deciding runtime observation bound to the selected artifact/runtime profile.",
        validationTest:
          resolution.narrowRuntimeQuestion ??
          (
            "Observe only the unresolved runtime dependency for scenario '" +
            label +
            "'. Promote only if the observation proves a wrong player-visible outcome."
          ),
        validationGroupKey:
          label + ":runtime-proof",
        subjectIds: link.subjectIds,
        componentIds: link.componentIds,
        evidenceIds: [
          ...link.evidenceIds,
          ...(resolution.evidenceIds ?? []),
        ],
      }));
      continue;
    }

    items.push(normalize({
      id: resolution.causalLinkId,
      source: "detection-gap",
      stage: "PROVE",
      title: "Resolve detection capability gap",
      reason:
        resolution.detectionGapReason ??
        "The selected artifact exposes a semantic/detection gap that prevents reliable causal classification.",
      missingProof:
        resolution.missingCapability
          ? "Analysis capability: " +
            resolution.missingCapability
          : "Selected-artifact semantic evidence sufficient to causally classify the dependency.",
      validationTest:
        "Resolve the missing semantic/capability evidence for scenario '" +
        label +
        "', then rerun causal analysis. Do not promote from absence of analysis alone.",
      validationGroupKey:
        label + ":detection-gap",
      subjectIds: link.subjectIds,
      componentIds: link.componentIds,
      evidenceIds: [
        ...link.evidenceIds,
        ...(resolution.evidenceIds ?? []),
      ],
    }));
  }

  return items;
}

function userIntentCoverageObligations(
  userIntent: AuditUserIntentEnvelope | undefined,
  world: GameplayWorldModel,
  graph: GameplayScenarioGraph,
): AuditObligation[] {
  if (userIntent === undefined) return [];

  const symptoms = userIntent.items.filter(
    (item) => item.kind === "SYMPTOM_REPORT",
  );
  if (symptoms.length === 0) return [];

  const surfaces = new Set(
    world.surfaceDiscovery.surfaceIds,
  );
  const scenarios = graph.scenarios;

  const covered = (
    domain:
      AuditUserIntentEnvelope["priorityDomains"][number],
  ): boolean => {
    switch (domain) {
      case "arena-multi-arena":
        return (
          world.arenas.detected ||
          [...surfaces].some((id) =>
            id.startsWith("runtime:arena")
          )
        );
      case "inventory-economy":
        return (
          surfaces.has("runtime:inventory") ||
          surfaces.has("runtime:economy")
        );
      case "progression-wave-objective":
        return scenarios.some((scenario) =>
          scenario.gameplayStage === "PROGRESSION" ||
          /wave|objective|level|progress/i.test(
            scenario.label,
          )
        );
      case "chunk-simulation":
        return surfaces.has("runtime:chunks");
      case "player-lifecycle":
        return (
          surfaces.has("runtime:teleport") ||
          scenarios.some((scenario) =>
            scenario.gameplayStage === "ENTRY_JOIN" ||
            scenario.gameplayStage === "RECOVERY" ||
            /join|leave|death|respawn|reconnect|recovery/i.test(
              scenario.label,
            )
          )
        );
      case "entity-ai-combat":
        return (
          surfaces.has("runtime:entities") ||
          surfaces.has("runtime:combat")
        );
      case "world-structure-mutation":
        return (
          surfaces.has("runtime:structures") ||
          surfaces.has("runtime:spatial")
        );
      case "ui-feedback-information":
        return (
          surfaces.has("runtime:ui-form") ||
          scenarios.some((scenario) =>
            /ui|form|dialogue|message|indicator|display|hud/i.test(
              scenario.label,
            )
          )
        );
      case "state-ownership":
        return surfaces.has("runtime:state");
      case "temporal-async":
        return (
          surfaces.has(
            "runtime:async-command-transaction",
          ) ||
          surfaces.has("runtime:dynamic-command") ||
          scenarios.some((scenario) =>
            /async|deferred|timer|delay|callback|timeout/i.test(
              scenario.label,
            )
          )
        );
      case "boundary-capacity":
        return (
          surfaces.has("runtime:boundaries") ||
          surfaces.has("runtime:arena-capacity")
        );
      case "persistence-recovery":
        return surfaces.has("runtime:persistence");
      case "platform-performance":
        return (
          surfaces.has("runtime:environment") ||
          world.platformKnowledge.claims.length > 0
        );
    }
  };

  const uncoveredDomains =
    userIntent.priorityDomains.filter(
      (domain) => !covered(domain),
    );

  const items: AuditObligation[] =
    uncoveredDomains.map((domain) =>
      normalize({
        id:
          "user-symptom-uncovered-domain:" +
          domain,
        source: "user-reported-symptom",
        stage: "DISCOVERY",
        title:
          "Reconcile user-reported symptom with " +
          domain,
        reason:
          "The user reported a potentially material symptom and raised " +
          domain +
          " as a search priority, but the selected-artifact audit has not yet discovered a sufficient matching gameplay surface/scenario. The user report is not proof that the domain exists or is broken.",
        missingProof:
          "Selected-artifact evidence that either identifies the implementing gameplay surface/scenario or proves this interpretation is not applicable to the selected map/version.",
        validationTest:
          "Re-check discovery/semantic ownership for " +
          domain +
          " using the selected artifact. If no matching gameplay mechanism exists, retain an evidence-backed not-applicable explanation rather than inventing a bug.",
        validationGroupKey:
          "user-input:" + domain,
        subjectIds: [],
        componentIds: [],
        evidenceIds: [],
      })
    );

  if (
    userIntent.priorityDomains.length === 0 &&
    userIntent.priorityPlayerFlows.length === 0
  ) {
    items.push(normalize({
      id: "user-symptom-unmapped",
      source: "user-reported-symptom",
      stage: "DISCOVERY",
      title:
        "Map user-reported symptom to selected-artifact gameplay",
      reason:
        "The user reported one or more symptoms, but the translated intake has no bounded priority domain or player-flow mapping yet.",
      missingProof:
        "A bounded selected-artifact gameplay/domain interpretation for the reported symptom.",
      validationTest:
        "Map the reported symptom to all cheap plausible selected-artifact gameplay mechanisms, preserve alternatives when ambiguous, and do not classify an issue until evidence resolves the interpretation.",
      validationGroupKey:
        "user-input:unmapped-symptom",
      subjectIds: [],
      componentIds: [],
      evidenceIds: [],
    }));
  }

  return items;
}

function closureObligations(
  closure: GameplayModelClosureResult,
): AuditObligation[] {
  const items: AuditObligation[] = [];

  for (const surface of closure.surfaces) {
    if (
      !surface.material ||
      (
        surface.status !== "unknown" &&
        surface.status !== "blocked"
      )
    ) {
      continue;
    }
    items.push(normalize({
      id: "closure-surface:" + surface.id,
      source: "gameplay-closure",
      stage: "UNDERSTAND",
      title:
        "Resolve gameplay surface " + surface.label,
      reason:
        surface.reason ??
        "Material gameplay surface remains unresolved.",
      missingProof:
        "Decisive selected-artifact evidence for " +
        surface.label +
        ".",
      validationTest:
        "Resolve " +
        surface.label +
        " through its normal and failure/recovery path before deciding whether a gameplay issue exists.",
      validationGroupKey:
        "closure-surface:" + surface.id,
      subjectIds: [surface.id],
      componentIds: [],
      evidenceIds: surface.evidenceIds ?? [],
    }));
  }

  for (const id of closure.unaccountedSurfaceIds) {
    items.push(normalize({
      id: "unaccounted-surface:" + id,
      source: "gameplay-closure",
      stage: "UNDERSTAND",
      title: "Account discovered surface " + id,
      reason:
        "A discovered material surface is not represented in Gameplay Model Closure.",
      missingProof:
        "Semantic ownership, gameplay purpose, dependencies, and proof path.",
      validationTest:
        "Trace " +
        id +
        " from trigger through state mutation and exit, then rerun causal analysis.",
      validationGroupKey:
        "unaccounted-surface:" + id,
      subjectIds: [id],
      componentIds: [],
      evidenceIds: [],
    }));
  }

  if (!closure.stateModelComplete) {
    items.push(normalize({
      id: "closure-gap:state-model",
      source: "gameplay-closure",
      stage: "UNDERSTAND",
      title: "Complete material state model",
      reason:
        "Gameplay Model Closure reports stateModelComplete=false.",
      missingProof:
        "Complete material state ownership and lifecycle coverage.",
      validationTest:
        "Complete create/read/write/clear/lifetime ownership for material gameplay state before issue classification.",
      validationGroupKey: "closure:state-model",
      subjectIds: [],
      componentIds: [],
      evidenceIds: [],
    }));
  }

  if (!closure.boundariesExtracted) {
    items.push(normalize({
      id: "closure-gap:boundaries",
      source: "gameplay-closure",
      stage: "MODEL",
      title: "Complete material gameplay boundaries",
      reason:
        "Gameplay Model Closure reports boundariesExtracted=false.",
      missingProof:
        "Complete boundary registry and below/at/above semantics.",
      validationTest:
        "Resolve each material boundary at N-1, N, and N+1 (or equivalent first/final points) before classifying a boundary defect.",
      validationGroupKey: "closure:boundaries",
      subjectIds: [],
      componentIds: [],
      evidenceIds: [],
    }));
  }

  return items;
}

export function deriveAuditObligations(input: {
  readonly graph: GameplayScenarioGraph;
  readonly defectResolution: GameplayDefectResolutionGate;
  readonly gameplayWorld: GameplayWorldModel;
  readonly userIntent?: AuditUserIntentEnvelope;
  readonly gameplayClosure: GameplayModelClosureResult;
  readonly negativeSpace: readonly NegativeSpaceSignal[];
  readonly temporalRisks: readonly TemporalInteractionRisk[];
  readonly discoveryChallenges:
    readonly GameplayDiscoveryChallengeSignal[];
  readonly sharedResourceSignals:
    readonly SharedResourceOwnershipSignal[];
  readonly compoundBoundaries:
    readonly CompoundBoundarySignal[];
  readonly accumulationGrowth:
    readonly AccumulationGrowthSignal[];
  readonly replicaDivergenceIds?: readonly string[];
}): readonly AuditObligation[] {
  const items: AuditObligation[] = [
    ...graphObligations(input.graph),
    ...closureObligations(input.gameplayClosure),
    ...resolutionObligations(
      input.graph,
      input.defectResolution,
    ),
    ...userIntentCoverageObligations(
      input.userIntent,
      input.gameplayWorld,
      input.graph,
    ),
  ];

  for (const signal of input.negativeSpace) {
    items.push(normalize({
      id: signal.id,
      source: "negative-space",
      stage: "STRESS",
      title: "Resolve lifecycle asymmetry for " + signal.subjectId,
      reason: signal.reason,
      missingProof:
        "Scenario-scoped proof that the missing lifecycle counterpart is required, reachable, and player-visible.",
      validationTest:
        "Trace the lifecycle counterpart implied by " +
        signal.kind +
        " for " +
        signal.subjectId +
        ". Promote to a finding only if a concrete gameplay contradiction is proven.",
      validationGroupKey:
        "negative-space:" + signal.subjectId,
      subjectIds: [signal.subjectId],
      componentIds: [],
      evidenceIds: signal.evidenceIds,
    }));
  }

  for (const risk of input.temporalRisks) {
    if (risk.priority !== "high") continue;
    const id =
      "temporal-risk:" +
      risk.leftSystem +
      ":" +
      risk.rightSystem;
    items.push(normalize({
      id,
      source: "temporal-risk",
      stage: "STRESS",
      title:
        "Resolve temporal interaction " +
        risk.leftSystem +
        " ↔ " +
        risk.rightSystem,
      reason:
        "High-risk timing factors are present: " +
        risk.factors.join(", ") +
        ".",
      missingProof:
        "Whether stale or overlapping work can actually commit after the relevant ownership/state transition.",
      validationTest:
        "Prove commit ordering/ownership across before, overlap, and after windows. Promote only if stale work can reach a wrong gameplay state.",
      validationGroupKey:
        "temporal:" +
        [risk.leftSystem, risk.rightSystem]
          .sort()
          .join(":"),
      subjectIds: [
        risk.leftSystem,
        risk.rightSystem,
      ],
      componentIds: [],
      evidenceIds: [],
    }));
  }

  for (const signal of input.discoveryChallenges) {
    items.push(normalize({
      id: signal.id,
      source: "discovery-challenge",
      stage: "DISCOVERY",
      title: "Resolve discovery challenge " + signal.subjectId,
      reason: signal.reason,
      missingProof:
        "Gameplay purpose, semantic owner, downstream effect, and scenario relationship.",
      validationTest:
        "Resolve " +
        signal.subjectId +
        " into its player-visible gameplay effect. If material, add it to the semantic/scenario model and rerun contradiction analysis.",
      validationGroupKey:
        "discovery-challenge:" + signal.subjectId,
      subjectIds: [signal.subjectId],
      componentIds: [],
      evidenceIds: signal.evidenceIds,
    }));
  }

  for (const signal of input.sharedResourceSignals) {
    items.push(normalize({
      id: signal.id,
      source: "shared-resource",
      stage: "STRESS",
      title:
        "Resolve shared-resource ownership for " +
        signal.surfaceId,
      reason: signal.reason,
      missingProof:
        "Mutual exclusion, authoritative ownership, generation scope, and ordering proof across writers.",
      validationTest:
        "Prove shared-resource ownership across overlap, cleanup, retry, reconnect, and reuse. Promote only if competing/stale writes can reach a wrong gameplay state.",
      validationGroupKey:
        "shared-resource:" + signal.surfaceId,
      subjectIds: [signal.surfaceId],
      componentIds: signal.regionIds,
      evidenceIds: signal.evidenceIds,
    }));
  }

  for (const signal of input.compoundBoundaries) {
    items.push(normalize({
      id: signal.id,
      source: "compound-boundary",
      stage: "STRESS",
      title:
        "Resolve compound boundary " +
        signal.dimensions.join(" × "),
      reason: signal.reason,
      missingProof:
        "Behavior at the combined boundary and whether the effective limit contradicts grounded gameplay intent.",
      validationTest:
        "Prove the combined boundary at the grounded safe point and next step. Promote only if a player-visible gameplay contradiction is established.",
      validationGroupKey: signal.id,
      subjectIds: signal.dimensions,
      componentIds: [],
      evidenceIds: signal.evidenceIds,
    }));
  }

  for (const signal of input.accumulationGrowth) {
    items.push(normalize({
      id: signal.id,
      source: "accumulation-growth",
      stage: "STRESS",
      title:
        "Resolve repeated-run growth for " +
        signal.subjectId,
      reason: signal.reason,
      missingProof:
        "A grounded balancing cleanup/reset path or proof that equivalent repeated runs do not accumulate state/resources.",
      validationTest:
        "Prove producer/consumer balance across repeated runs. Promote only if accumulation reaches a wrong player-visible gameplay state.",
      validationGroupKey: signal.id,
      subjectIds: [signal.subjectId],
      componentIds: [],
      evidenceIds: signal.evidenceIds,
    }));
  }

  for (const id of input.replicaDivergenceIds ?? []) {
    items.push(normalize({
      id,
      source: "replica-divergence",
      stage: "MODEL",
      title: "Classify replica divergence " + id,
      reason:
        "A world/topology difference exists but its gameplay significance is not yet classified.",
      missingProof:
        "Grounded evidence showing whether the divergence is expected/non-material or affects a player-visible gameplay dependency.",
      validationTest:
        "Trace the divergent world/topology evidence to gameplay purpose. Promote only a grounded gameplay consequence into causal PROVE.",
      validationGroupKey:
        "full-map-replica:" + id,
      subjectIds: [id],
      componentIds: [],
      evidenceIds: [id],
    }));
  }

  const byId = new Map<string, AuditObligation>();
  for (const item of items) {
    byId.set(item.id, item);
  }

  return [...byId.values()].sort((a, b) =>
    a.stage.localeCompare(b.stage) ||
    a.source.localeCompare(b.source) ||
    a.id.localeCompare(b.id)
  );
}
