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
  | "replica-divergence";

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
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  return [...byId.values()].sort((a, b) =>
    a.stage.localeCompare(b.stage) ||
    a.source.localeCompare(b.source) ||
    a.id.localeCompare(b.id)
  );
}
