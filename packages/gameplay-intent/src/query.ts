import type {
  GameplayIntentEdge,
  GameplayIntentModel,
  GameplayIntentNode,
  GameplayIntentNodeKind,
  GameplayIntentPolicyOperand,
  GameplayIntentPolicyPredicate,
  GameplayIntentScalar,
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

export type GameplayPolicyEvaluation =
  | "satisfied"
  | "violated"
  | "unknown";

function resolvePolicyOperand(
  operand: GameplayIntentPolicyOperand,
  values: Readonly<Record<string, unknown>>,
): GameplayIntentScalar | undefined {
  if (operand.kind === "literal") return operand.value;
  if (Object.prototype.hasOwnProperty.call(values, operand.path)) {
    const value = values[operand.path];
    return (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    )
      ? value
      : undefined;
  }

  const parts = operand.path.split(".");
  let current: unknown = values;
  for (const part of parts) {
    if (
      typeof current !== "object" ||
      current === null ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return (
    typeof current === "string" ||
    typeof current === "number" ||
    typeof current === "boolean" ||
    current === null
  )
    ? current
    : undefined;
}

function compareScalars(
  operator: Extract<
    GameplayIntentPolicyPredicate,
    { kind: "comparison" }
  >["operator"],
  left: GameplayIntentScalar,
  right: GameplayIntentScalar,
): boolean | undefined {
  if (operator === "eq") return left === right;
  if (operator === "neq") return left !== right;

  if (
    typeof left !== "number" ||
    typeof right !== "number"
  ) {
    return undefined;
  }

  if (operator === "lt") return left < right;
  if (operator === "lte") return left <= right;
  if (operator === "gt") return left > right;
  return left >= right;
}

export function evaluateGameplayPolicyPredicate(
  predicate: GameplayIntentPolicyPredicate,
  values: Readonly<Record<string, unknown>>,
): GameplayPolicyEvaluation {
  if (predicate.kind === "unknown") return "unknown";

  if (
    predicate.kind === "truthy" ||
    predicate.kind === "falsy"
  ) {
    const value = resolvePolicyOperand(predicate.operand, values);
    if (value === undefined) return "unknown";
    const truthy = Boolean(value);
    const satisfied =
      predicate.kind === "truthy" ? truthy : !truthy;
    return satisfied ? "satisfied" : "violated";
  }

  if (predicate.kind === "comparison") {
    const left = resolvePolicyOperand(predicate.left, values);
    const right = resolvePolicyOperand(predicate.right, values);
    if (left === undefined || right === undefined) {
      return "unknown";
    }
    const result = compareScalars(
      predicate.operator,
      left,
      right,
    );
    if (result === undefined) return "unknown";
    return result ? "satisfied" : "violated";
  }

  if (predicate.kind === "in") {
    const value = resolvePolicyOperand(predicate.operand, values);
    if (value === undefined) return "unknown";
    return predicate.values.includes(value)
      ? "satisfied"
      : "violated";
  }

  if (predicate.kind === "fallback") {
    const evaluations = predicate.excludedPredicates.map(
      (child) =>
        evaluateGameplayPolicyPredicate(child, values),
    );
    if (evaluations.includes("satisfied")) return "violated";
    if (evaluations.every((item) => item === "violated")) {
      return "satisfied";
    }
    return "unknown";
  }

  const evaluations = predicate.predicates.map((child) =>
    evaluateGameplayPolicyPredicate(child, values)
  );

  if (predicate.kind === "all") {
    if (evaluations.includes("violated")) return "violated";
    if (evaluations.every((item) => item === "satisfied")) {
      return "satisfied";
    }
    return "unknown";
  }

  if (evaluations.includes("satisfied")) return "satisfied";
  if (evaluations.every((item) => item === "violated")) {
    return "violated";
  }
  return "unknown";
}

export type GameplayOutcomeAdmissibility =
  | "admissible"
  | "inadmissible"
  | "unknown";

export interface GameplayOutcomePolicyAssessment {
  outcomeId: string;
  disposition: GameplayOutcomeAdmissibility;
  policies: readonly {
    policyId: string;
    evaluation: GameplayPolicyEvaluation;
  }[];
  reasons: readonly string[];
}

export function evaluateGameplayOutcomeAdmissibility(
  model: GameplayIntentModel,
  outcomeId: string,
  values: Readonly<Record<string, unknown>>,
): GameplayOutcomePolicyAssessment {
  const blockingUnknowns = model.unknowns.filter((unknown) =>
    unknown.blockedSubjectIds.includes(outcomeId)
  );
  if (blockingUnknowns.length > 0) {
    return {
      outcomeId,
      disposition: "unknown",
      policies: [],
      reasons: blockingUnknowns.map(
        (unknown) =>
          `Intent remains unresolved: ${unknown.question}`,
      ),
    };
  }

  const policyEdges = model.edges.filter(
    (edge) =>
      edge.from === outcomeId &&
      edge.kind === "requires" &&
      edge.status === "authored" &&
      model.nodes.find((node) => node.id === edge.to)?.kind === "policy",
  );

  if (policyEdges.length === 0) {
    return {
      outcomeId,
      disposition: "unknown",
      policies: [],
      reasons: [
        "No authored policy edge is available for this outcome.",
      ],
    };
  }

  const policies = policyEdges.map((edge) => {
    const node = model.nodes.find((item) => item.id === edge.to);
    return {
      policyId: edge.to,
      evaluation:
        node?.policyPredicate === undefined
          ? "unknown" as const
          : evaluateGameplayPolicyPredicate(
              node.policyPredicate,
              values,
            ),
    };
  });

  if (
    policies.some(
      (policy) => policy.evaluation === "satisfied",
    )
  ) {
    return {
      outcomeId,
      disposition: "admissible",
      policies,
      reasons: [
        "At least one authored direct guard for the outcome is satisfied.",
      ],
    };
  }

  if (
    policies.every(
      (policy) => policy.evaluation === "violated",
    )
  ) {
    return {
      outcomeId,
      disposition: "inadmissible",
      policies,
      reasons: [
        "All authored direct guards for the outcome are violated.",
      ],
    };
  }

  return {
    outcomeId,
    disposition: "unknown",
    policies,
    reasons: [
      "No guard is satisfied and at least one policy evaluation is unknown.",
    ],
  };
}
