import type {
  GameplayIntentModel,
} from "./types.js";

export interface GameplayIntentValidationIssue {
  path: string;
  message: string;
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

export function validateGameplayIntentModel(
  model: GameplayIntentModel,
): GameplayIntentValidationIssue[] {
  const issues: GameplayIntentValidationIssue[] = [];

  if (model.schemaVersion !== 1) {
    issues.push({
      path: "schemaVersion",
      message: "Unsupported Gameplay Intent schema version.",
    });
  }

  for (const [path, values] of [
    ["evidence", model.evidence.map((item) => item.id)],
    ["nodes", model.nodes.map((item) => item.id)],
    ["edges", model.edges.map((item) => item.id)],
    ["invariants", model.invariants.map((item) => item.id)],
    ["unknowns", model.unknowns.map((item) => item.id)],
  ] as const) {
    for (const id of duplicates(values)) {
      issues.push({
        path,
        message: `Duplicate identifier: ${id}.`,
      });
    }
  }

  const nodeIds = new Set(model.nodes.map((node) => node.id));
  const evidenceIds = new Set(
    model.evidence.map((evidence) => evidence.id),
  );

  const validateEvidenceRefs = (
    path: string,
    ids: readonly string[],
  ) => {
    if (ids.length === 0) {
      issues.push({
        path,
        message: "Semantic intent claims require evidence binding.",
      });
    }
    for (const id of ids) {
      if (!evidenceIds.has(id)) {
        issues.push({
          path,
          message: `Unknown evidence reference: ${id}.`,
        });
      }
    }
  };

  for (const node of model.nodes) {
    validateEvidenceRefs(
      `nodes.${node.id}.evidenceIds`,
      node.evidenceIds,
    );
  }

  for (const edge of model.edges) {
    if (!nodeIds.has(edge.from)) {
      issues.push({
        path: `edges.${edge.id}.from`,
        message: `Unknown source node: ${edge.from}.`,
      });
    }
    if (!nodeIds.has(edge.to)) {
      issues.push({
        path: `edges.${edge.id}.to`,
        message: `Unknown target node: ${edge.to}.`,
      });
    }
    validateEvidenceRefs(
      `edges.${edge.id}.evidenceIds`,
      edge.evidenceIds,
    );
  }

  for (const invariant of model.invariants) {
    if (invariant.subjectIds.length === 0) {
      issues.push({
        path: `invariants.${invariant.id}.subjectIds`,
        message: "Invariant must reference at least one intent subject.",
      });
    }
    for (const subjectId of invariant.subjectIds) {
      if (!nodeIds.has(subjectId)) {
        issues.push({
          path: `invariants.${invariant.id}.subjectIds`,
          message: `Unknown intent subject: ${subjectId}.`,
        });
      }
    }
    validateEvidenceRefs(
      `invariants.${invariant.id}.evidenceIds`,
      invariant.evidenceIds,
    );
  }

  for (const unknown of model.unknowns) {
    for (const subjectId of unknown.blockedSubjectIds) {
      if (!nodeIds.has(subjectId)) {
        issues.push({
          path: `unknowns.${unknown.id}.blockedSubjectIds`,
          message: `Unknown blocked intent subject: ${subjectId}.`,
        });
      }
    }
    for (const evidenceId of unknown.evidenceIds ?? []) {
      if (!evidenceIds.has(evidenceId)) {
        issues.push({
          path: `unknowns.${unknown.id}.evidenceIds`,
          message: `Unknown evidence reference: ${evidenceId}.`,
        });
      }
    }
  }

  return issues;
}
