import {
  assessMechanicCompleteness,
  challengeDesignIntent,
  type DesignIntentChallengeResult,
  type GameplayIntentModel,
  type MechanicCompletenessResult,
} from "../../../gameplay-intent/src/index.js";
import {
  buildGameplayAuditScenarioPreset,
  detectGameplayDegradation,
  findDesignConsistencyAnomalies,
  findNegativeSpace,
  prioritizeTemporalInteraction,
  type DesignConsistencyAnomaly,
  type GameplayDegradationSignal,
  type GameplayAuditScenarioPreset,
  type NegativeSpaceSignal,
  type TemporalInteractionRisk,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  SemanticIr,
} from "../../../semantic-ir/src/index.js";
import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";
import {
  compileGameplayScenarioGraph,
} from "./gameplay-scenario-compiler.js";
import {
  assessGameplayScenarioClosure,
} from "./gameplay-scenario-closure.js";
import {
  assessGameplayDefectResolutionGate,
  type GameplayDefectResolution,
  type GameplayDefectResolutionGate,
} from "./gameplay-defect-resolution.js";
import type {
  GameplayScenarioClosure,
  GameplayScenarioGraph,
} from "./gameplay-scenario-model.js";

export interface HiddenGameplayDefectAnalysis {
  readonly schemaVersion: 1;
  readonly designIntentChallenges: readonly {
    readonly subjectId: string;
    readonly label: string;
    readonly kind: GameplayIntentModel["nodes"][number]["kind"];
    readonly status: GameplayIntentModel["nodes"][number]["status"];
    readonly highRisk: boolean;
    readonly result: DesignIntentChallengeResult;
  }[];
  readonly mechanicCompleteness:
    readonly MechanicCompletenessResult[];
  readonly negativeSpace:
    readonly NegativeSpaceSignal[];
  readonly temporalRisks:
    readonly TemporalInteractionRisk[];
  readonly designConsistency:
    readonly DesignConsistencyAnomaly[];
  readonly degradations:
    readonly GameplayDegradationSignal[];
  readonly auditScenarioPreset: GameplayAuditScenarioPreset;
  readonly scenarioAudit: {
    readonly graph: GameplayScenarioGraph;
    readonly closure: GameplayScenarioClosure;
    readonly defectResolution: GameplayDefectResolutionGate;
  };
  readonly attention: {
    readonly implementationOnlyIntent: number;
    readonly incompleteMechanics: number;
    readonly negativeSpaceSignals: number;
    readonly highTemporalRisks: number;
    readonly designAnomalies: number;
    readonly silentDegradations: number;
    readonly mandatoryAuditScenarios: number;
    readonly orphanGameplayComponents: number;
    readonly unresolvedCausalLinks: number;
    readonly contradictedCausalLinks: number;
    readonly defectResolutionBlocked: boolean;
    readonly runtimeProofResidue: number;
  };
}

function evidenceForNode(
  model: GameplayIntentModel,
  evidenceIds: readonly string[],
) {
  const wanted = new Set(evidenceIds);
  return model.evidence.filter((item) =>
    wanted.has(item.id)
  );
}

function materialIntentChallenges(
  model: GameplayIntentModel,
) {
  return model.nodes
    .filter((node) =>
      node.kind === "mechanic" ||
      node.kind === "objective" ||
      node.kind === "phase" ||
      node.kind === "state" ||
      node.kind === "resource" ||
      node.kind === "lifecycle" ||
      node.kind === "spatial-region" ||
      node.kind === "policy" ||
      node.kind === "outcome"
    )
    .map((node) => {
      const evidence = evidenceForNode(
        model,
        node.evidenceIds,
      );
      const implementationEvidenceIds =
        evidence
          .filter((item) =>
            item.scope === "selected-artifact" &&
            item.origin === "source-code"
          )
          .map((item) => item.id);
      const independentDesignEvidenceIds =
        evidence
          .filter((item) =>
            item.scope === "selected-artifact" &&
            item.origin !== "source-code"
          )
          .map((item) => item.id);
      const playerFacingEvidenceIds =
        evidence
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
          .map((item) => item.id);

      const highRisk =
        node.kind === "policy" ||
        node.kind === "resource" ||
        node.kind === "spatial-region" ||
        (
          node.kind === "mechanic" &&
          /(?:limit|capacity|queue|max|min|fallback|throttle|admission|concurrent|slot)/i.test(
            node.label,
          )
        );

      return {
        subjectId: node.id,
        label: node.label,
        kind: node.kind,
        status: node.status,
        highRisk,
        result: challengeDesignIntent({
          implementationEvidenceIds,
          independentDesignEvidenceIds,
          playerFacingEvidenceIds,
          status: node.status,
        }),
      };
    });
}

function mechanicAssessments(
  model: GameplayIntentModel,
): readonly MechanicCompletenessResult[] {
  const outgoing = new Map<
    string,
    typeof model.edges
  >();
  const incoming = new Map<
    string,
    typeof model.edges
  >();

  for (const edge of model.edges) {
    outgoing.set(
      edge.from,
      [...(outgoing.get(edge.from) ?? []), edge],
    );
    incoming.set(
      edge.to,
      [...(incoming.get(edge.to) ?? []), edge],
    );
  }

  return model.nodes
    .filter((node) => node.kind === "mechanic")
    .map((node) => {
      const out = outgoing.get(node.id) ?? [];
      const inc = incoming.get(node.id) ?? [];
      const evidenceIds = [
        ...new Set([
          ...node.evidenceIds,
          ...out.flatMap((edge) => edge.evidenceIds),
          ...inc.flatMap((edge) => edge.evidenceIds),
        ]),
      ];

      const reachable =
        inc.some((edge) =>
          edge.kind === "requires" ||
          edge.kind === "transitions-to" ||
          edge.kind === "valid-during" ||
          edge.kind === "participates-in"
        ) ||
        out.some((edge) =>
          edge.kind === "valid-during" ||
          edge.kind === "scoped-to"
        );

      const triggered =
        inc.some((edge) =>
          edge.kind === "produces" ||
          edge.kind === "requires"
        ) ||
        out.some((edge) =>
          edge.kind === "produces"
        );

      const consumed =
        out.some((edge) =>
          edge.kind === "consumes" ||
          edge.kind === "produces" ||
          edge.kind === "transitions-to"
        );

      const effectApplied =
        out.some((edge) =>
          edge.kind === "produces" ||
          edge.kind === "transitions-to" ||
          edge.kind === "wins-by" ||
          edge.kind === "loses-by"
        );

      const playerVisible =
        out.some((edge) => {
          const target = model.nodes.find(
            (candidate) => candidate.id === edge.to,
          );
          return (
            target?.kind === "outcome" ||
            target?.kind === "objective" ||
            target?.kind === "state" ||
            target?.kind === "resource"
          );
        });

      return assessMechanicCompleteness({
        mechanicId: node.id,
        stages: {
          declared: node.status === "authored",
          reachable,
          triggered,
          consumed,
          "effect-applied": effectApplied,
          "player-visible": playerVisible,
        },
        evidenceIds,
      });
    });
}

function negativeSpaceFromState(
  ir: SemanticIr,
): readonly NegativeSpaceSignal[] {
  const bySurface = new Map<
    string,
    {
      read: boolean;
      write: boolean;
      clear: boolean;
      evidenceIds: string[];
    }
  >();

  for (const operation of ir.state.operations) {
    const current = bySurface.get(
      operation.surfaceId,
    ) ?? {
      read: false,
      write: false,
      clear: false,
      evidenceIds: [],
    };

    if (operation.operation === "read") {
      current.read = true;
    }
    if (
      operation.operation === "write" ||
      operation.operation === "delete"
    ) {
      current.write = true;
    }
    if (
      operation.operation === "clear" ||
      operation.operation === "delete"
    ) {
      current.clear = true;
    }

    current.evidenceIds.push(operation.id);
    bySurface.set(operation.surfaceId, current);
  }

  return [...bySurface.entries()].flatMap(
    ([surfaceId, state]) =>
      findNegativeSpace({
        subjectId: surfaceId,
        hasProducer: state.write,
        hasConsumer: state.read,
        hasReset: state.clear,
        hasBaselineRestore:
          state.clear ? state.write : undefined,
        evidenceIds: state.evidenceIds,
      }),
  );
}

function temporalRisksFromIr(
  ir: SemanticIr,
): readonly TemporalInteractionRisk[] {
  return ir.temporal.relations.flatMap(
    (relation) => {
      const factors = [
        relation.kind === "deferred"
          ? "async" as const
          : undefined,
        relation.kind === "periodic"
          ? "shared-resource" as const
          : undefined,
        relation.guardEvidence === "unresolved"
          ? "delayed-callback" as const
          : undefined,
      ].filter(
        (
          value,
        ): value is
          | "async"
          | "shared-resource"
          | "delayed-callback" =>
          value !== undefined,
      );

      if (factors.length === 0) return [];

      return [
        prioritizeTemporalInteraction({
          leftSystem: relation.from,
          rightSystem:
            relation.to ??
            relation.targetLabel,
          factors,
        }),
      ];
    },
  );
}

function consistencyFromWorld(
  world: GameplayWorldModel,
): readonly DesignConsistencyAnomaly[] {
  if (
    !world.arenas.detected ||
    world.arenas.count === undefined ||
    world.arenas.count < 3
  ) {
    return [];
  }

  const observations = Array.from(
    { length: world.arenas.count },
    (_, index) => ({
      subjectId: "arena:" + String(index + 1),
      dimension: "arena-peer-availability",
      value: true,
    }),
  );

  const safeConcurrent =
    world.arenas.safeConcurrentArenas;
  if (
    safeConcurrent !== undefined &&
    safeConcurrent !== null &&
    safeConcurrent < world.arenas.count
  ) {
    for (
      let index = safeConcurrent;
      index < world.arenas.count;
      index += 1
    ) {
      observations[index] = {
        subjectId: "arena:" + String(index + 1),
        dimension: "arena-peer-availability",
        value: false,
      };
    }
  }

  return findDesignConsistencyAnomalies(
    observations,
  );
}

function degradationFromWorld(
  world: GameplayWorldModel,
): readonly GameplayDegradationSignal[] {
  const output: GameplayDegradationSignal[] = [];

  if (
    world.arenas.count !== undefined &&
    world.arenas.safeConcurrentArenas !==
      undefined &&
    world.arenas.safeConcurrentArenas !== null
  ) {
    output.push(
      ...detectGameplayDegradation({
        subjectId: "runtime:arena-capacity",
        primaryExpected: true,
        primaryObserved:
          world.arenas.safeConcurrentArenas >=
          world.arenas.count,
        expectedCapacity:
          world.arenas.count,
        observedCapacity:
          world.arenas.safeConcurrentArenas,
        evidenceIds: [
          "world:arena-count",
          "capacity:safe-concurrency",
        ],
      }),
    );
  }

  return output;
}

function auditScenarioPresetFromModel(
  input: {
    readonly semanticIr: SemanticIr;
    readonly world: GameplayWorldModel;
    readonly defectResolutions?: readonly GameplayDefectResolution[];
  },
): GameplayAuditScenarioPreset {
  const deferredWork =
    input.semanticIr.temporal.relations.some(
      (relation) =>
        relation.kind === "deferred" ||
        relation.guardEvidence === "unresolved",
    );

  return buildGameplayAuditScenarioPreset({
    arenaCount: input.world.arenas.count,
    concurrentArenaLimit:
      input.world.arenas.safeConcurrentArenas ??
      input.world.arenas.declaredConcurrentArenaLimit,
    maxPartySize:
      input.world.arenas.perArenaPlayerCapacity,
    hasMultiArena:
      input.world.arenas.detected &&
      (input.world.arenas.count ?? 0) > 1,
    hasPersistence:
      input.world.persistence !== undefined,
    hasDeferredWork: deferredWork,
    hasRepeatedRunSurface:
      input.world.arenas.detected,
  });
}

export function analyzeHiddenGameplayDefects(
  input: {
    readonly intent: GameplayIntentModel;
    readonly semanticIr: SemanticIr;
    readonly world: GameplayWorldModel;
    readonly defectResolutions?: readonly GameplayDefectResolution[];
  },
): HiddenGameplayDefectAnalysis {
  const designIntentChallenges =
    materialIntentChallenges(input.intent);
  const mechanicCompleteness =
    mechanicAssessments(input.intent);
  const negativeSpace =
    negativeSpaceFromState(input.semanticIr);
  const temporalRisks =
    temporalRisksFromIr(input.semanticIr);
  const designConsistency =
    consistencyFromWorld(input.world);
  const degradations =
    degradationFromWorld(input.world);
  const auditScenarioPreset =
    auditScenarioPresetFromModel(input);
  const scenarioGraph =
    compileGameplayScenarioGraph({
      intent: input.intent,
      world: input.world,
      preset: auditScenarioPreset,
    });
  const scenarioClosure =
    assessGameplayScenarioClosure(
      scenarioGraph,
    );
  const defectResolution =
    assessGameplayDefectResolutionGate(
      scenarioGraph,
      input.defectResolutions ?? [],
    );

  return {
    schemaVersion: 1,
    designIntentChallenges,
    mechanicCompleteness,
    negativeSpace,
    temporalRisks,
    designConsistency,
    degradations,
    auditScenarioPreset,
    scenarioAudit: {
      graph: scenarioGraph,
      closure: scenarioClosure,
      defectResolution,
    },
    attention: {
      implementationOnlyIntent:
        designIntentChallenges.filter(
          (item) =>
            item.highRisk &&
            item.result.disposition ===
            "implementation-only",
        ).length,
      incompleteMechanics:
        mechanicCompleteness.filter(
          (item) => !item.complete,
        ).length,
      negativeSpaceSignals:
        negativeSpace.length,
      highTemporalRisks:
        temporalRisks.filter(
          (item) => item.priority === "high",
        ).length,
      designAnomalies:
        designConsistency.length,
      silentDegradations:
        degradations.length,
      mandatoryAuditScenarios:
        auditScenarioPreset.scenarios.length,
      orphanGameplayComponents:
        scenarioClosure.orphanComponentIds.length,
      unresolvedCausalLinks:
        scenarioClosure.unresolvedCausalLinkIds.length,
      contradictedCausalLinks:
        defectResolution.contradictedCausalLinkIds.length,
      defectResolutionBlocked:
        defectResolution.status === "BLOCKED",
      runtimeProofResidue:
        defectResolution.runtimeProofRequiredIds.length,
    },
  };
}

export function refreshHiddenGameplayDefectsForWorld(
  existing: HiddenGameplayDefectAnalysis,
  world: GameplayWorldModel,
): HiddenGameplayDefectAnalysis {
  const designConsistency =
    consistencyFromWorld(world);
  const degradations =
    degradationFromWorld(world);
  const auditScenarioPreset =
    buildGameplayAuditScenarioPreset({
      arenaCount: world.arenas.count,
      concurrentArenaLimit:
        world.arenas.safeConcurrentArenas ??
        world.arenas.declaredConcurrentArenaLimit,
      maxPartySize:
        world.arenas.perArenaPlayerCapacity,
      hasMultiArena:
        world.arenas.detected &&
        (world.arenas.count ?? 0) > 1,
      hasPersistence:
        world.persistence !== undefined,
      hasDeferredWork:
        existing.auditScenarioPreset.scenarios.some(
          (scenario) => scenario.kind === "deferred-ownership",
        ),
      hasRepeatedRunSurface:
        world.arenas.detected,
    });

  const scenarioGraph =
    compileGameplayScenarioGraph({
      intent: {
        schemaVersion: 1,
        id: "refresh-unavailable-intent",
        evidence: [],
        nodes: [],
        edges: [],
        invariants: [],
        unknowns: [],
      },
      world,
      preset: auditScenarioPreset,
    });
  const scenarioClosure =
    scenarioGraph.scenarios.length === 0
      ? existing.scenarioAudit.closure
      : assessGameplayScenarioClosure(scenarioGraph);
  const defectResolution =
    scenarioGraph.scenarios.length === 0
      ? existing.scenarioAudit.defectResolution
      : assessGameplayDefectResolutionGate(
          scenarioGraph,
          existing.scenarioAudit.defectResolution.resolutions,
        );

  return {
    ...existing,
    designConsistency,
    degradations,
    auditScenarioPreset,
    scenarioAudit:
      scenarioGraph.scenarios.length === 0
        ? existing.scenarioAudit
        : {
            graph: scenarioGraph,
            closure: scenarioClosure,
            defectResolution,
          },
    attention: {
      ...existing.attention,
      designAnomalies:
        designConsistency.length,
      silentDegradations:
        degradations.length,
      mandatoryAuditScenarios:
        auditScenarioPreset.scenarios.length,
      orphanGameplayComponents:
        scenarioGraph.scenarios.length === 0
          ? existing.attention.orphanGameplayComponents
          : scenarioClosure.orphanComponentIds.length,
      unresolvedCausalLinks:
        scenarioGraph.scenarios.length === 0
          ? existing.attention.unresolvedCausalLinks
          : scenarioClosure.unresolvedCausalLinkIds.length,
      contradictedCausalLinks:
        defectResolution.contradictedCausalLinkIds.length,
      defectResolutionBlocked:
        defectResolution.status === "BLOCKED",
      runtimeProofResidue:
        defectResolution.runtimeProofRequiredIds.length,
    },
  };
}
