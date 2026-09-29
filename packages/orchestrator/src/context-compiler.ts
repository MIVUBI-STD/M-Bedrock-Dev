import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
import type { GameplayWorldModel } from "./gameplay-world-model.js";
import type {
  SemanticGraph,
  SemanticNode,
} from "../../graph/src/index.js";
import type {
  SourceRef,
} from "../../project-model/src/index.js";
import type {
  SemanticAffectedPlan,
} from "./semantic-affected-plan.js";

export interface ContextCompilerBudget {
  maxSemanticNodes: number;
  maxSemanticEdges: number;
  maxIntentNodes: number;
  maxInvariants: number;
  maxUnknowns: number;
  maxEvidence: number;
}

export interface ContextCompilerRequest {
  goal: string;
  graph: SemanticGraph;
  intent: GameplayIntentModel;
  affected?: SemanticAffectedPlan;
  relevantSemanticNodeIds?: readonly string[];
  relevantIntentSubjectIds?: readonly string[];
  relevantInvariantIds?: readonly string[];
  relevantEvidenceIds?: readonly string[];
  worldModel?: GameplayWorldModel;
  budget?: Partial<ContextCompilerBudget>;
}

export interface CompiledContextPack {
  schemaVersion: 1;
  goal: string;
  semantic: {
    nodes: Array<{
      id: string;
      kind: string;
      identifier: string;
      source: SourceRef;
    }>;
    edges: Array<{
      from: string;
      type: string;
      targetIdentifier: string;
      status: string;
      to?: string;
      source: SourceRef;
    }>;
    omitted: number;
    omittedEdges: number;
  };
  intent: {
    nodes: Array<{
      id: string;
      kind: string;
      label: string;
      status: string;
      evidenceIds: readonly string[];
    }>;
    invariants: Array<{
      id: string;
      statement: string;
      strength: string;
      status: string;
      subjectIds: readonly string[];
      evidenceIds: readonly string[];
    }>;
    unknowns: Array<{
      id: string;
      question: string;
      blockedSubjectIds: readonly string[];
      evidenceIds: readonly string[];
    }>;
    evidence: Array<{
      id: string;
      origin: string;
      locator: string;
      summary: string;
    }>;
  };
  world?: {
    arenaCount?: number;
    arenaBasis?: "topology" | "script-config" | "reconciled";
    objectives: readonly string[];
    phases: readonly string[];
    outcomes: readonly string[];
    lifecycle: GameplayWorldModel["arenas"]["lifecycle"];
    cleanup: GameplayWorldModel["arenas"]["cleanup"];
    isolation: GameplayWorldModel["arenas"]["isolation"];
    globalState:
      GameplayWorldModel["arenas"]["globalState"];
    stress:
      GameplayWorldModel["arenas"]["stress"];
    proofMode?: string;
    skippedProofLayers: readonly string[];
    broadWrites: number;
    unresolvedScriptMutations: number;
    intentUnknowns: number;
  };
  budget: ContextCompilerBudget;
  truncation: {
    semanticNodes: number;
    semanticEdges: number;
    intentNodes: number;
    invariants: number;
    unknowns: number;
    evidence: number;
  };
  missingRequested: {
    semanticNodeIds: readonly string[];
    intentSubjectIds: readonly string[];
    invariantIds: readonly string[];
    evidenceIds: readonly string[];
  };
  complete: boolean;
  reasons: readonly string[];
}

const DEFAULT_BUDGET:
  ContextCompilerBudget = {
  maxSemanticNodes: 24,
  maxSemanticEdges: 40,
  maxIntentNodes: 20,
  maxInvariants: 16,
  maxUnknowns: 12,
  maxEvidence: 32,
};

function positiveInteger(
  value: number | undefined,
  fallback: number,
): number {
  if (value === undefined) {
    return fallback;
  }

  if (
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      "Context compiler budgets must be positive integers.",
    );
  }

  return value;
}

function resolveBudget(
  value:
    Partial<ContextCompilerBudget> |
    undefined,
): ContextCompilerBudget {
  return {
    maxSemanticNodes:
      positiveInteger(
        value?.maxSemanticNodes,
        DEFAULT_BUDGET
          .maxSemanticNodes,
      ),
    maxSemanticEdges:
      positiveInteger(
        value?.maxSemanticEdges,
        DEFAULT_BUDGET
          .maxSemanticEdges,
      ),
    maxIntentNodes:
      positiveInteger(
        value?.maxIntentNodes,
        DEFAULT_BUDGET
          .maxIntentNodes,
      ),
    maxInvariants:
      positiveInteger(
        value?.maxInvariants,
        DEFAULT_BUDGET
          .maxInvariants,
      ),
    maxUnknowns:
      positiveInteger(
        value?.maxUnknowns,
        DEFAULT_BUDGET
          .maxUnknowns,
      ),
    maxEvidence:
      positiveInteger(
        value?.maxEvidence,
        DEFAULT_BUDGET
          .maxEvidence,
      ),
  };
}

function unique(
  values: readonly string[] |
    undefined,
): string[] {
  return [
    ...new Set(
      (values ?? []).filter(
        (value) =>
          value.trim().length > 0,
      ),
    ),
  ].sort();
}

function take<T>(
  values: readonly T[],
  maximum: number,
): {
  values: T[];
  omitted: number;
} {
  return {
    values:
      values.slice(0, maximum),
    omitted:
      Math.max(
        0,
        values.length - maximum,
      ),
  };
}

function semanticCandidates(
  graph: SemanticGraph,
  affected:
    SemanticAffectedPlan |
    undefined,
): SemanticNode[] {
  const nodes =
    graph.allNodes();

  if (
    affected?.status !== "planned"
  ) {
    return nodes;
  }

  const allowed =
    new Set(
      affected.affectedNodeIds,
    );

  return nodes.filter(
    (node) =>
      allowed.has(node.id),
  );
}

export function compileContextPack(
  input: ContextCompilerRequest,
): CompiledContextPack {
  if (!input.goal.trim()) {
    throw new Error(
      "Context compiler goal must be non-empty.",
    );
  }

  const budget =
    resolveBudget(input.budget);
  const semanticPool =
    semanticCandidates(
      input.graph,
      input.affected,
    );
  const requestedSemanticIds =
    new Set(
      unique(
        input.relevantSemanticNodeIds,
      ),
    );
  const allGraphNodes =
    input.graph.allNodes();
  const semanticById =
    new Map(
      allGraphNodes.map((node) => [
        node.id,
        node,
      ]),
    );
  const requiredSemanticNodes =
    [...requestedSemanticIds]
      .map((id) =>
        semanticById.get(id)
      )
      .filter(
        (node):
          node is SemanticNode =>
          node !== undefined,
      )
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      );

  if (
    requiredSemanticNodes.length >
    budget.maxSemanticNodes
  ) {
    throw new Error(
      "Context compiler maxSemanticNodes is smaller than the explicitly required semantic node set.",
    );
  }

  const requiredSemanticSet =
    new Set(
      requiredSemanticNodes.map(
        (node) => node.id,
      ),
    );
  const optionalSemanticNodes =
    semanticPool.filter(
      (node) =>
        !requiredSemanticSet.has(
          node.id,
        ),
    );
  const semanticCapacity =
    budget.maxSemanticNodes -
    requiredSemanticNodes.length;
  const optionalSemanticSelection =
    take(
      optionalSemanticNodes,
      semanticCapacity,
    );
  const semanticSelection = {
    values: [
      ...requiredSemanticNodes,
      ...optionalSemanticSelection.values,
    ].sort((a, b) =>
      a.id.localeCompare(b.id)
    ),
    omitted:
      optionalSemanticSelection.omitted,
  };
  const selectedSemanticIds =
    new Set(
      semanticSelection.values.map(
        (node) => node.id,
      ),
    );
  const allSemanticEdges =
    input.graph.allEdges();
  const requiredSemanticEdges =
    allSemanticEdges
      .filter((edge) =>
        requiredSemanticSet.has(
          edge.from,
        ) ||
        (
          edge.to !== undefined &&
          requiredSemanticSet.has(
            edge.to,
          )
        )
      )
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      );

  if (
    requiredSemanticEdges.length >
    budget.maxSemanticEdges
  ) {
    throw new Error(
      "Context compiler maxSemanticEdges is smaller than the relationships required by the explicit semantic node set.",
    );
  }

  const requiredSemanticEdgeIds =
    new Set(
      requiredSemanticEdges.map(
        (edge) => edge.id,
      ),
    );
  const optionalSemanticEdges =
    allSemanticEdges
      .filter((edge) =>
        !requiredSemanticEdgeIds.has(
          edge.id,
        ) &&
        (
          selectedSemanticIds.has(
            edge.from,
          ) ||
          (
            edge.to !== undefined &&
            selectedSemanticIds.has(
              edge.to,
            )
          )
        )
      )
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      );
  const semanticEdgeCapacity =
    budget.maxSemanticEdges -
    requiredSemanticEdges.length;
  const optionalSemanticEdgeSelection =
    take(
      optionalSemanticEdges,
      semanticEdgeCapacity,
    );
  const semanticEdgeSelection = {
    values: [
      ...requiredSemanticEdges,
      ...optionalSemanticEdgeSelection.values,
    ].sort((a, b) =>
      a.id.localeCompare(b.id)
    ),
    omitted:
      optionalSemanticEdgeSelection.omitted,
  };

  const requestedSubjects =
    new Set(
      unique(
        input
          .relevantIntentSubjectIds,
      ),
    );
  const requestedInvariants =
    new Set(
      unique(
        input.relevantInvariantIds,
      ),
    );
  const requestedEvidence =
    new Set(
      unique(
        input.relevantEvidenceIds,
      ),
    );

  const invariantSubjectIds =
    new Set(
      input.intent.invariants
        .filter((invariant) =>
          requestedInvariants.has(
            invariant.id,
          )
        )
        .flatMap(
          (invariant) =>
            invariant.subjectIds,
        ),
    );

  const evidenceSubjectIds =
    new Set(
      input.intent.nodes
        .filter((node) =>
          node.evidenceIds.some(
            (id) =>
              requestedEvidence.has(id),
          )
        )
        .map((node) => node.id),
    );

  const explicitSubjectScope =
    new Set([
      ...requestedSubjects,
      ...invariantSubjectIds,
      ...evidenceSubjectIds,
    ]);

  const explicitIntentRequest =
    requestedSubjects.size > 0 ||
    requestedInvariants.size > 0 ||
    requestedEvidence.size > 0;

  const intentNodes =
    input.intent.nodes
      .filter((node) =>
        !explicitIntentRequest ||
        explicitSubjectScope.has(
          node.id,
        )
      )
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      );

  if (
    explicitSubjectScope.size > 0 &&
    intentNodes.length >
      budget.maxIntentNodes
  ) {
    throw new Error(
      "Context compiler maxIntentNodes is smaller than the explicitly required intent subject set.",
    );
  }

  const nodeSelection =
    explicitSubjectScope.size > 0
      ? {
          values: [...intentNodes],
          omitted: 0,
        }
      : take(
          intentNodes,
          budget.maxIntentNodes,
        );
  const selectedSubjectIds =
    new Set(
      nodeSelection.values.map(
        (node) => node.id,
      ),
    );

  const invariants =
    input.intent.invariants
      .filter((invariant) =>
        (
          requestedInvariants.size > 0 &&
          requestedInvariants.has(
            invariant.id,
          )
        ) ||
        (
          selectedSubjectIds.size > 0 &&
          invariant.subjectIds.some(
            (id) =>
              selectedSubjectIds.has(
                id,
              ),
          )
        )
      )
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      );

  if (
    explicitSubjectScope.size > 0 &&
    invariants.length >
      budget.maxInvariants
  ) {
    throw new Error(
      "Context compiler maxInvariants is smaller than the invariants required by the explicit intent scope.",
    );
  }

  const invariantSelection =
    explicitSubjectScope.size > 0
      ? {
          values: [...invariants],
          omitted: 0,
        }
      : take(
          invariants,
          budget.maxInvariants,
        );

  const relevantIntentIds =
    new Set([
      ...selectedSubjectIds,
      ...invariantSelection.values
        .flatMap(
          (item) =>
            item.subjectIds,
        ),
    ]);

  const unknowns =
    input.intent.unknowns
      .filter((unknown) =>
        unknown.blockedSubjectIds
          .length === 0 ||
        unknown.blockedSubjectIds
          .some((id) =>
            relevantIntentIds.has(id)
          )
      )
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      );

  if (
    explicitSubjectScope.size > 0 &&
    unknowns.length >
      budget.maxUnknowns
  ) {
    throw new Error(
      "Context compiler maxUnknowns is smaller than the unknowns required by the explicit intent scope.",
    );
  }

  const unknownSelection =
    explicitSubjectScope.size > 0
      ? {
          values: [...unknowns],
          omitted: 0,
        }
      : take(
          unknowns,
          budget.maxUnknowns,
        );

  const evidenceIds =
    new Set([
      ...requestedEvidence,
      ...nodeSelection.values
        .flatMap(
          (item) =>
            item.evidenceIds,
        ),
      ...invariantSelection.values
        .flatMap(
          (item) =>
            item.evidenceIds,
        ),
      ...unknownSelection.values
        .flatMap(
          (item) =>
            item.evidenceIds ?? [],
        ),
    ]);

  const evidence =
    input.intent.evidence
      .filter((item) =>
        evidenceIds.has(item.id)
      )
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      );

  const explicitIntentScope =
    explicitSubjectScope.size > 0 ||
    requestedInvariants.size > 0 ||
    requestedEvidence.size > 0;

  if (
    explicitIntentScope &&
    evidence.length >
      budget.maxEvidence
  ) {
    throw new Error(
      "Context compiler maxEvidence is smaller than the evidence required by the explicit intent scope.",
    );
  }

  const evidenceSelection =
    explicitIntentScope
      ? {
          values: [...evidence],
          omitted: 0,
        }
      : take(
          evidence,
          budget.maxEvidence,
        );

  const knownIntentIds =
    new Set(
      input.intent.nodes.map(
        (item) => item.id,
      ),
    );
  const knownInvariantIds =
    new Set(
      input.intent.invariants.map(
        (item) => item.id,
      ),
    );
  const knownEvidenceIds =
    new Set(
      input.intent.evidence.map(
        (item) => item.id,
      ),
    );

  const allGraphNodeIds =
    new Set(
      input.graph.allNodes().map(
        (node) => node.id,
      ),
    );

  const missingRequested = {
    semanticNodeIds: [
      ...requestedSemanticIds,
    ].filter(
      (id) =>
        !allGraphNodeIds.has(id),
    ).sort(),
    intentSubjectIds: [
      ...explicitSubjectScope,
    ].filter(
      (id) => !knownIntentIds.has(id),
    ).sort(),
    invariantIds: [
      ...requestedInvariants,
    ].filter(
      (id) =>
        !knownInvariantIds.has(id),
    ).sort(),
    evidenceIds: [
      ...requestedEvidence,
    ].filter(
      (id) =>
        !knownEvidenceIds.has(id),
    ).sort(),
  };

  const optionalTruncated =
    semanticSelection.omitted > 0 ||
    semanticEdgeSelection.omitted > 0 ||
    nodeSelection.omitted > 0 ||
    invariantSelection.omitted > 0 ||
    unknownSelection.omitted > 0 ||
    evidenceSelection.omitted > 0;
  const semanticScopeExplicit =
    requestedSemanticIds.size > 0;
  const intentScopeExplicit =
    requestedSubjects.size > 0 ||
    requestedInvariants.size > 0 ||
    requestedEvidence.size > 0;
  const semanticOptionalTruncated =
    semanticSelection.omitted > 0 ||
    semanticEdgeSelection.omitted > 0;
  const intentOptionalTruncated =
    nodeSelection.omitted > 0 ||
    invariantSelection.omitted > 0 ||
    unknownSelection.omitted > 0 ||
    evidenceSelection.omitted > 0;

  const missingRequestedCount =
    missingRequested
      .semanticNodeIds.length +
    missingRequested
      .intentSubjectIds.length +
    missingRequested
      .invariantIds.length +
    missingRequested
      .evidenceIds.length;
  const complete =
    missingRequestedCount === 0 &&
    (
      semanticScopeExplicit ||
      !semanticOptionalTruncated
    ) &&
    (
      intentScopeExplicit ||
      !intentOptionalTruncated
    );

  const noExplicitIntentScope =
    requestedSubjects.size === 0 &&
    requestedInvariants.size === 0 &&
    requestedEvidence.size === 0;

  const world = input.worldModel === undefined
    ? undefined
    : {
        ...(input.worldModel.arenas.count === undefined
          ? {}
          : { arenaCount: input.worldModel.arenas.count }),
        ...(input.worldModel.arenas.basis === undefined
          ? {}
          : { arenaBasis: input.worldModel.arenas.basis }),
        objectives:
          input.worldModel.subjects.find(
            (item) => item.kind === "objective",
          )?.ids ?? [],
        phases:
          input.worldModel.subjects.find(
            (item) => item.kind === "phase",
          )?.ids ?? [],
        outcomes:
          input.worldModel.subjects.find(
            (item) => item.kind === "outcome",
          )?.ids ?? [],
        lifecycle: input.worldModel.arenas.lifecycle,
        cleanup: input.worldModel.arenas.cleanup,
        isolation: input.worldModel.arenas.isolation,
        globalState:
          input.worldModel.arenas.globalState,
        stress:
          input.worldModel.arenas.stress,
        ...(input.worldModel.arenas
          .proofExecution === undefined
          ? {}
          : {
              proofMode:
                input.worldModel.arenas
                  .proofExecution.mode,
            }),
        skippedProofLayers:
          input.worldModel.arenas
            .proofExecution?.skippedLayers ?? [],
        broadWrites:
          input.worldModel.state.broadWrites,
        unresolvedScriptMutations:
          input.worldModel.spatial
            .unresolvedScriptMutations +
          input.worldModel.spatial
            .rejectedScriptMutations,
        intentUnknowns:
          input.worldModel.intent.unknowns.length,
      };

  return {
    schemaVersion: 1,
    goal: input.goal,
    ...(world === undefined ? {} : { world }),
    semantic: {
      nodes:
        semanticSelection.values.map(
          (node) => ({
            id: node.id,
            kind: node.kind,
            identifier:
              node.identifier,
            source: {
              ...node.source,
              ...(node.source.range ===
              undefined
                ? {}
                : {
                    range: {
                      ...node.source.range,
                    },
                  }),
            },
          }),
        ),
      edges:
        semanticEdgeSelection.values.map(
          (edge) => ({
            from: edge.from,
            type: edge.type,
            targetIdentifier:
              edge.targetIdentifier,
            status: edge.status,
            ...(edge.to === undefined
              ? {}
              : { to: edge.to }),
            source: {
              ...edge.evidence.source,
              ...(edge.evidence.source
                .range === undefined
                ? {}
                : {
                    range: {
                      ...edge.evidence
                        .source.range,
                    },
                  }),
            },
          }),
        ),
      omitted:
        semanticSelection.omitted,
      omittedEdges:
        semanticEdgeSelection.omitted,
    },
    intent: {
      nodes:
        nodeSelection.values.map(
          (node) => ({
            id: node.id,
            kind: node.kind,
            label: node.label,
            status: node.status,
            evidenceIds: [
              ...node.evidenceIds,
            ],
          }),
        ),
      invariants:
        invariantSelection.values
          .map((item) => ({
            id: item.id,
            statement:
              item.statement,
            strength:
              item.strength,
            status: item.status,
            subjectIds: [
              ...item.subjectIds,
            ],
            evidenceIds: [
              ...item.evidenceIds,
            ],
          })),
      unknowns:
        unknownSelection.values
          .map((item) => ({
            id: item.id,
            question:
              item.question,
            blockedSubjectIds: [
              ...item
                .blockedSubjectIds,
            ],
            evidenceIds: [
              ...(item
                .evidenceIds ??
                []),
            ],
          })),
      evidence:
        evidenceSelection.values
          .map((item) => ({
            id: item.id,
            origin: item.origin,
            locator: item.locator,
            summary: item.summary,
          })),
    },
    budget,
    truncation: {
      semanticNodes:
        semanticSelection.omitted,
      semanticEdges:
        semanticEdgeSelection.omitted,
      intentNodes:
        nodeSelection.omitted,
      invariants:
        invariantSelection.omitted,
      unknowns:
        unknownSelection.omitted,
      evidence:
        evidenceSelection.omitted,
    },
    missingRequested,
    complete,
    reasons: [
      input.affected?.status ===
      "planned"
        ? "Semantic context is restricted to the proven affected closure."
        : "No proven affected closure was supplied; semantic context remains conservatively broad within budget.",
      noExplicitIntentScope
        ? "No explicit intent subject/invariant scope was supplied; intent nodes are conservatively included within budget."
        : "Intent context uses only explicitly requested subjects/invariants and their directly referenced evidence.",
      optionalTruncated
        ? complete
          ? "Context budget truncated only optional surrounding context; explicitly required scope remains complete."
          : "Context budget truncated an unscoped context category; narrow relevance or expand that category budget."
        : "Context budget did not truncate the selected evidence.",
      missingRequestedCount > 0
        ? "One or more explicitly requested intent/invariant/evidence ids are missing; the context pack is incomplete."
        : "All explicitly requested intent/invariant/evidence ids are present.",
    ],
  };
}
