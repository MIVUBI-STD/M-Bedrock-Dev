import {
  assessMechanicCompleteness,
  challengeDesignIntent,
  type DesignIntentChallengeResult,
  type GameplayIntentModel,
  type MechanicCompletenessResult,
} from "../../../gameplay-intent/src/index.js";
import {
  findDesignConsistencyAnomalies,
  findNegativeSpace,
  prioritizeTemporalInteraction,
  type DesignConsistencyAnomaly,
  type NegativeSpaceSignal,
  type TemporalInteractionRisk,
} from "../../../diagnostic-reasoning/src/index.js";
import type {
  SemanticIr,
} from "../../../semantic-ir/src/index.js";
import type {
  GameplayWorldModel,
} from "./gameplay-world-model.js";

export interface HiddenGameplayDefectAnalysis {
  readonly schemaVersion: 1;
  readonly designIntentChallenges: readonly {
    readonly subjectId: string;
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
  readonly attention: {
    readonly implementationOnlyIntent: number;
    readonly incompleteMechanics: number;
    readonly negativeSpaceSignals: number;
    readonly highTemporalRisks: number;
    readonly designAnomalies: number;
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

      return {
        subjectId: node.id,
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

  if (
    world.arenas.requestedConcurrentArenas !==
      undefined &&
    world.arenas.requestedConcurrentArenas <
      world.arenas.count
  ) {
    const unavailable =
      world.arenas.count -
      world.arenas.requestedConcurrentArenas;
    for (
      let index =
        world.arenas.requestedConcurrentArenas;
      index < world.arenas.count;
      index += 1
    ) {
      observations[index] = {
        subjectId: "arena:" + String(index + 1),
        dimension: "arena-peer-availability",
        value: false,
      };
    }
    void unavailable;
  }

  return findDesignConsistencyAnomalies(
    observations,
  );
}

export function analyzeHiddenGameplayDefects(
  input: {
    readonly intent: GameplayIntentModel;
    readonly semanticIr: SemanticIr;
    readonly world: GameplayWorldModel;
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

  return {
    schemaVersion: 1,
    designIntentChallenges,
    mechanicCompleteness,
    negativeSpace,
    temporalRisks,
    designConsistency,
    attention: {
      implementationOnlyIntent:
        designIntentChallenges.filter(
          (item) =>
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
    },
  };
}
