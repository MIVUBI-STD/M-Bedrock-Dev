import type {
  GameplayIntentEdge,
  GameplayIntentModel,
  GameplayIntentNode,
  GameplayIntentNodeKind,
  IntentGroundingAssessment,
} from "./types.js";

export function gameplayIntentNodesByKind(
  model: GameplayIntentModel,
  kind: GameplayIntentNodeKind,
): GameplayIntentNode[] {
  return model.nodes.filter((node) => node.kind === kind);
}

export function gameplayIntentOutgoingEdges(
  model: GameplayIntentModel,
  nodeId: string,
): GameplayIntentEdge[] {
  return model.edges.filter((edge) => edge.from === nodeId);
}

export function gameplayIntentIncomingEdges(
  model: GameplayIntentModel,
  nodeId: string,
): GameplayIntentEdge[] {
  return model.edges.filter((edge) => edge.to === nodeId);
}

export function assessGameplayIntentGrounding(
  model: GameplayIntentModel,
  subjectIds: readonly string[],
): IntentGroundingAssessment {
  const evidenceIds = new Set(model.evidence.map((item) => item.id));
  const unsupportedIds: string[] = [];
  const reasons: string[] = [];

  for (const subjectId of subjectIds) {
    const node = model.nodes.find((item) => item.id === subjectId);
    if (!node) {
      unsupportedIds.push(subjectId);
      reasons.push(
        `Intent subject ${subjectId} does not exist in the model.`,
      );
      continue;
    }

    if (node.evidenceIds.length === 0) {
      unsupportedIds.push(subjectId);
      reasons.push(
        `Intent subject ${subjectId} has no evidence binding.`,
      );
      continue;
    }

    const missingEvidence = node.evidenceIds.filter(
      (evidenceId) => !evidenceIds.has(evidenceId),
    );
    if (missingEvidence.length > 0) {
      unsupportedIds.push(subjectId);
      reasons.push(
        `Intent subject ${subjectId} references missing evidence: ${missingEvidence.join(", ")}.`,
      );
    }
  }

  const unknowns = model.unknowns.filter((unknown) =>
    unknown.blockedSubjectIds.some((subjectId) =>
      subjectIds.includes(subjectId),
    ),
  );

  if (unsupportedIds.length > 0) {
    return {
      disposition: "insufficient",
      subjectIds: [...subjectIds],
      unknownIds: unknowns.map((unknown) => unknown.id),
      unsupportedIds,
      reasons,
    };
  }

  if (unknowns.length > 0) {
    return {
      disposition: "ambiguous",
      subjectIds: [...subjectIds],
      unknownIds: unknowns.map((unknown) => unknown.id),
      unsupportedIds: [],
      reasons: [
        ...reasons,
        ...unknowns.map(
          (unknown) =>
            `Open intent question ${unknown.id}: ${unknown.question}`,
        ),
      ],
    };
  }

  return {
    disposition: "grounded",
    subjectIds: [...subjectIds],
    unknownIds: [],
    unsupportedIds: [],
    reasons: ["All requested intent subjects are evidence-grounded."],
  };
}
