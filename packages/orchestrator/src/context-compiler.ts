import type {
  GameplayIntentModel,
} from "../../gameplay-intent/src/index.js";
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
  relevantIntentSubjectIds?: readonly string[];
  relevantInvariantIds?: readonly string[];
  relevantEvidenceIds?: readonly string[];
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
    omitted: number;
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
  budget: ContextCompilerBudget;
  truncation: {
    semanticNodes: number;
    intentNodes: number;
    invariants: number;
    unknowns: number;
    evidence: number;
  };
  missingRequested: {
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
  const semanticSelection =
    take(
      semanticCandidates(
        input.graph,
        input.affected,
      ),
      budget.maxSemanticNodes,
    );

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

  const intentNodes =
    input.intent.nodes
      .filter((node) =>
        requestedSubjects.size === 0 ||
        requestedSubjects.has(
          node.id,
        )
      )
      .sort((a, b) =>
        a.id.localeCompare(b.id)
      );

  const nodeSelection =
    take(
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

  const invariantSelection =
    take(
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

  const unknownSelection =
    take(
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

  const evidenceSelection =
    take(
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

  const missingRequested = {
    intentSubjectIds: [
      ...requestedSubjects,
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

  const truncated =
    semanticSelection.omitted > 0 ||
    nodeSelection.omitted > 0 ||
    invariantSelection.omitted > 0 ||
    unknownSelection.omitted > 0 ||
    evidenceSelection.omitted > 0;
  const missingRequestedCount =
    missingRequested
      .intentSubjectIds.length +
    missingRequested
      .invariantIds.length +
    missingRequested
      .evidenceIds.length;
  const complete =
    !truncated &&
    missingRequestedCount === 0;

  const noExplicitIntentScope =
    requestedSubjects.size === 0 &&
    requestedInvariants.size === 0;

  return {
    schemaVersion: 1,
    goal: input.goal,
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
      omitted:
        semanticSelection.omitted,
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
      truncated
        ? "Context budget truncated one or more categories; omitted counts are explicit and the context pack is incomplete."
        : "Context budget did not truncate the selected evidence.",
      missingRequestedCount > 0
        ? "One or more explicitly requested intent/invariant/evidence ids are missing; the context pack is incomplete."
        : "All explicitly requested intent/invariant/evidence ids are present.",
    ],
  };
}
