import {
  extractGameplayIntentSignals,
  type GameplayIntentRelationSignal,
  type GameplayIntentSignal,
} from "../../../analyzers/gameplay-intent/src/index.js";
import type {
  ParsedScriptFile,
} from "../../../analyzers/scripts/src/index.js";
import {
  validateGameplayIntentModel,
  type GameplayIntentEdge,
  type GameplayIntentEvidence,
  type GameplayIntentInvariant,
  type GameplayIntentModel,
  type GameplayIntentNode,
  type GameplayIntentStatus,
} from "../../gameplay-intent/src/index.js";

export interface GameplayIntentStageInput {
  id: string;
  artifactId?: string;
  parsedScripts: readonly {
    parsed: ParsedScriptFile;
  }[];
  authoredScripts?: readonly {
    parsed: ParsedScriptFile;
  }[];
}

const STATUS_RANK: Readonly<Record<GameplayIntentStatus, number>> = {
  hypothesis: 0,
  inferred: 1,
  authored: 2,
};

function evidenceId(
  signal: GameplayIntentSignal | GameplayIntentRelationSignal,
): string {
  return "intent-evidence:" + signal.id;
}

export function buildGameplayIntentModel(
  input: GameplayIntentStageInput,
): GameplayIntentModel {
  const extracted = extractGameplayIntentSignals([
    ...input.parsedScripts.map((item) => item.parsed),
    ...(input.authoredScripts ?? []).map(
      (item) => item.parsed,
    ),
  ]);

  const evidence = new Map<string, GameplayIntentEvidence>();
  const nodes = new Map<string, GameplayIntentNode>();
  const edges = new Map<string, GameplayIntentEdge>();
  const invariants = new Map<string, GameplayIntentInvariant>();
  const intentUnknowns: GameplayIntentModel["unknowns"][number][] = [];

  for (const signal of extracted.signals) {
    const id = evidenceId(signal);
    evidence.set(id, {
      id,
      origin: signal.evidenceOrigin,
      locator: signal.locator,
      summary: signal.summary,
    });

    const existing = nodes.get(signal.subjectKey);
    if (!existing) {
      nodes.set(signal.subjectKey, {
        id: signal.subjectKey,
        kind: signal.nodeKind,
        label: signal.label,
        status: signal.status,
        evidenceIds: [id],
        ...(signal.policyPredicate === undefined
          ? {}
          : { policyPredicate: signal.policyPredicate }),
      });
      continue;
    }

    const mergedEvidence = [
      ...new Set([...existing.evidenceIds, id]),
    ].sort();

    nodes.set(signal.subjectKey, {
      ...existing,
      status:
        STATUS_RANK[signal.status] > STATUS_RANK[existing.status]
          ? signal.status
          : existing.status,
      evidenceIds: mergedEvidence,
      ...(existing.policyPredicate !== undefined
        ? { policyPredicate: existing.policyPredicate }
        : signal.policyPredicate !== undefined
        ? { policyPredicate: signal.policyPredicate }
        : {}),
    });
  }

  for (const relation of extracted.relations) {
    if (
      !nodes.has(relation.fromSubjectKey) ||
      !nodes.has(relation.toSubjectKey)
    ) {
      continue;
    }

    const id = evidenceId(relation);
    evidence.set(id, {
      id,
      origin: relation.evidenceOrigin,
      locator: relation.locator,
      summary: relation.summary,
    });

    edges.set(relation.id, {
      id: relation.id,
      from: relation.fromSubjectKey,
      to: relation.toSubjectKey,
      kind: relation.edgeKind,
      status: relation.status,
      evidenceIds: [id],
    });
  }

  const authoredTransitionsByFrom = new Map<
    string,
    GameplayIntentEdge[]
  >();

  for (const edge of edges.values()) {
    if (
      edge.kind !== "transitions-to" ||
      edge.status !== "authored"
    ) {
      continue;
    }
    const list =
      authoredTransitionsByFrom.get(edge.from) ?? [];
    list.push(edge);
    authoredTransitionsByFrom.set(edge.from, list);
  }

  for (const [from, transitions] of authoredTransitionsByFrom) {
    const targetLabels = transitions
      .map((edge) => nodes.get(edge.to)?.label ?? edge.to)
      .sort();
    const evidenceIds = [
      ...new Set(
        transitions.flatMap((edge) => edge.evidenceIds),
      ),
    ].sort();

    invariants.set("inv:allowed-transitions:" + from, {
      id: "inv:allowed-transitions:" + from,
      statement:
        (nodes.get(from)?.label ?? from) +
        " transitions only to declared successors: " +
        targetLabels.join(", "),
      strength: "must",
      status: "inferred",
      subjectIds: [from],
      evidenceIds,
    });
  }

  for (const coverage of extracted.outcomePolicyCoverage) {
    const policyEdges = [...edges.values()].filter(
      (edge) =>
        edge.from === coverage.outcomeSubjectKey &&
        edge.kind === "requires" &&
        edge.status === "authored" &&
        nodes.get(edge.to)?.kind === "policy",
    );

    if (
      coverage.completeDirectGuardCoverage &&
      policyEdges.length > 0
    ) {
      const policyLabels = policyEdges
        .map((edge) => nodes.get(edge.to)?.label ?? edge.to)
        .sort();
      const evidenceIds = [
        ...new Set(
          policyEdges.flatMap((edge) => edge.evidenceIds),
        ),
      ].sort();

      invariants.set(
        "inv:admissible-policy:" +
          coverage.outcomeSubjectKey,
        {
          id:
            "inv:admissible-policy:" +
            coverage.outcomeSubjectKey,
          statement:
            (nodes.get(coverage.outcomeSubjectKey)?.label ??
              coverage.outcomeSubjectKey) +
            " is statically observed only under one of these direct guards: " +
            policyLabels.join(" OR "),
          strength: "must",
          status: "inferred",
          subjectIds: [coverage.outcomeSubjectKey],
          evidenceIds,
        },
      );
      continue;
    }

    if (coverage.totalLiteralReturnSites > 0) {
      intentUnknowns.push({
        id:
          "unknown:outcome-policy-coverage:" +
          coverage.outcomeSubjectKey,
        question:
          "Not every recognized literal return site for this outcome is controlled by a directly modeled if-guard; switch/default/nested or other control flow may still define admissibility.",
        blockedSubjectIds: [coverage.outcomeSubjectKey],
      });
    }
  }

  const model: GameplayIntentModel = {
    schemaVersion: 1,
    id: input.id,
    ...(input.artifactId === undefined
      ? {}
      : { artifactId: input.artifactId }),
    evidence: [...evidence.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    nodes: [...nodes.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    edges: [...edges.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    invariants: [...invariants.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    unknowns: [
      ...(nodes.size === 0
        ? [{
            id: "unknown:no-intent-signals",
            question:
              "No gameplay-intent signal could be grounded from the available static script evidence.",
            blockedSubjectIds: [] as readonly string[],
          }]
        : []),
      ...intentUnknowns,
    ],
  };

  const errors = validateGameplayIntentModel(model);
  if (errors.length > 0) {
    throw new Error(
      "Gameplay Intent Model failed validation: " +
        errors
          .map((error) => error.path + ": " + error.message)
          .join("; "),
    );
  }

  return model;
}
