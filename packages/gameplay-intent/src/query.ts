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

function resolvePolicyPath(
  path: string,
  values: Readonly<Record<string, unknown>>,
): { found: boolean; value?: unknown } {
  if (Object.prototype.hasOwnProperty.call(values, path)) {
    return { found: true, value: values[path] };
  }

  const parts = path.split(".");
  let current: unknown = values;
  for (const part of parts) {
    if (
      typeof current !== "object" ||
      current === null ||
      !Object.prototype.hasOwnProperty.call(current, part)
    ) {
      return { found: false };
    }
    current = (current as Record<string, unknown>)[part];
  }

  return { found: true, value: current };
}

function resolvePolicyOperand(
  operand: GameplayIntentPolicyOperand,
  values: Readonly<Record<string, unknown>>,
): { found: boolean; value?: unknown } {
  if (operand.kind === "literal") {
    return { found: true, value: operand.value };
  }

  if (operand.kind === "path") {
    return resolvePolicyPath(operand.path, values);
  }

  const base = resolvePolicyOperand(operand.base, values);
  const key = resolvePolicyOperand(operand.key, values);
  if (!base.found || !key.found) return { found: false };

  if (
    (typeof base.value !== "object" || base.value === null) ||
    (
      typeof key.value !== "string" &&
      typeof key.value !== "number"
    )
  ) {
    return { found: false };
  }

  const property = String(key.value);
  if (!Object.prototype.hasOwnProperty.call(base.value, property)) {
    return { found: false };
  }

  return {
    found: true,
    value: (base.value as Record<string, unknown>)[property],
  };
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
    const resolved = resolvePolicyOperand(
      predicate.operand,
      values,
    );
    if (!resolved.found) return "unknown";
    const truthy = Boolean(resolved.value);
    const satisfied =
      predicate.kind === "truthy" ? truthy : !truthy;
    return satisfied ? "satisfied" : "violated";
  }

  if (predicate.kind === "comparison") {
    const left = resolvePolicyOperand(predicate.left, values);
    const right = resolvePolicyOperand(predicate.right, values);
    if (!left.found || !right.found) {
      return "unknown";
    }
    if (
      !(
        typeof left.value === "string" ||
        typeof left.value === "number" ||
        typeof left.value === "boolean" ||
        left.value === null
      ) ||
      !(
        typeof right.value === "string" ||
        typeof right.value === "number" ||
        typeof right.value === "boolean" ||
        right.value === null
      )
    ) {
      return "unknown";
    }
    const result = compareScalars(
      predicate.operator,
      left.value,
      right.value,
    );
    if (result === undefined) return "unknown";
    return result ? "satisfied" : "violated";
  }

  if (predicate.kind === "in") {
    const resolved = resolvePolicyOperand(
      predicate.operand,
      values,
    );
    if (!resolved.found) return "unknown";
    if (
      !(
        typeof resolved.value === "string" ||
        typeof resolved.value === "number" ||
        typeof resolved.value === "boolean" ||
        resolved.value === null
      )
    ) {
      return "unknown";
    }
    return predicate.values.includes(resolved.value)
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

  const unresolved = policyEdges.flatMap((edge) => {
    const node = model.nodes.find(
      (item) => item.id === edge.to,
    );
    if (!node?.policyPredicate) return [];
    return unresolvedGameplayPolicyOperands(
      node.policyPredicate,
      values,
    ).map(describeGameplayPolicyOperand);
  });

  return {
    outcomeId,
    disposition: "unknown",
    policies,
    reasons: [
      "No guard is satisfied and at least one policy evaluation is unknown.",
      ...(unresolved.length === 0
        ? []
        : [
            "Required runtime state is unresolved: " +
            [...new Set(unresolved)].sort().join(", "),
          ]),
    ],
  };
}

export function describeGameplayPolicyOperand(
  operand: GameplayIntentPolicyOperand,
): string {
  if (operand.kind === "path") return operand.path;
  if (operand.kind === "literal") {
    return JSON.stringify(operand.value);
  }
  return (
    describeGameplayPolicyOperand(operand.base) +
    "[" +
    describeGameplayPolicyOperand(operand.key) +
    "]"
  );
}

export function unresolvedGameplayPolicyOperands(
  predicate: GameplayIntentPolicyPredicate,
  values: Readonly<Record<string, unknown>>,
): GameplayIntentPolicyOperand[] {
  const unresolved = new Map<
    string,
    GameplayIntentPolicyOperand
  >();

  const add = (operand: GameplayIntentPolicyOperand): void => {
    if (operand.kind === "literal") return;
    if (!resolvePolicyOperand(operand, values).found) {
      unresolved.set(
        describeGameplayPolicyOperand(operand),
        operand,
      );
    }
  };

  const visit = (
    current: GameplayIntentPolicyPredicate,
  ): void => {
    if (current.kind === "unknown") return;

    if (
      current.kind === "truthy" ||
      current.kind === "falsy"
    ) {
      add(current.operand);
      return;
    }

    if (current.kind === "comparison") {
      add(current.left);
      add(current.right);
      return;
    }

    if (current.kind === "in") {
      add(current.operand);
      return;
    }

    const children =
      current.kind === "fallback"
        ? current.excludedPredicates
        : current.predicates;

    for (const child of children) {
      if (
        evaluateGameplayPolicyPredicate(
          child,
          values,
        ) === "unknown"
      ) {
        visit(child);
      }
    }
  };

  visit(predicate);
  return [...unresolved.values()];
}

export interface GameplayOutcomePolicyRequirement {
  policyId: string;
  predicate: GameplayIntentPolicyPredicate;
  operands: readonly GameplayIntentPolicyOperand[];
}

function policyOperands(
  predicate: GameplayIntentPolicyPredicate,
): GameplayIntentPolicyOperand[] {
  const found = new Map<
    string,
    GameplayIntentPolicyOperand
  >();

  const add = (operand: GameplayIntentPolicyOperand): void => {
    if (operand.kind === "literal") return;
    found.set(describeGameplayPolicyOperand(operand), operand);
  };

  const visit = (
    current: GameplayIntentPolicyPredicate,
  ): void => {
    if (current.kind === "unknown") return;
    if (
      current.kind === "truthy" ||
      current.kind === "falsy"
    ) {
      add(current.operand);
      return;
    }
    if (current.kind === "comparison") {
      add(current.left);
      add(current.right);
      return;
    }
    if (current.kind === "in") {
      add(current.operand);
      return;
    }
    for (const child of (
      current.kind === "fallback"
        ? current.excludedPredicates
        : current.predicates
    )) {
      visit(child);
    }
  };

  visit(predicate);
  return [...found.values()];
}

export function gameplayOutcomePolicyRequirements(
  model: GameplayIntentModel,
  outcomeId: string,
): GameplayOutcomePolicyRequirement[] {
  return model.edges.flatMap((edge) => {
    if (
      edge.from !== outcomeId ||
      edge.kind !== "requires" ||
      edge.status !== "authored"
    ) {
      return [];
    }

    const policy = model.nodes.find(
      (node) =>
        node.id === edge.to &&
        node.kind === "policy",
    );
    if (!policy?.policyPredicate) return [];

    return [{
      policyId: policy.id,
      predicate: policy.policyPredicate,
      operands: policyOperands(
        policy.policyPredicate,
      ),
    }];
  });
}

export interface GameplayRuntimeObservationNeed {
  policyId: string;
  expression: string;
  operand: GameplayIntentPolicyOperand;
  paths: readonly string[];
  deferred: boolean;
}

function leafOperandPaths(
  operand: GameplayIntentPolicyOperand,
): string[] {
  if (operand.kind === "path") return [operand.path];
  if (operand.kind === "literal") return [];
  return [
    ...leafOperandPaths(operand.base),
    ...leafOperandPaths(operand.key),
  ];
}

function observationPathsForOperand(
  operand: GameplayIntentPolicyOperand,
  values: Readonly<Record<string, unknown>>,
): {
  paths: string[];
  deferred: boolean;
} {
  if (operand.kind === "path") {
    return {
      paths: [operand.path],
      deferred: false,
    };
  }

  if (operand.kind === "literal") {
    return {
      paths: [],
      deferred: false,
    };
  }

  const key = resolvePolicyOperand(operand.key, values);
  if (
    key.found &&
    (
      typeof key.value === "string" ||
      typeof key.value === "number"
    ) &&
    operand.base.kind === "path"
  ) {
    return {
      paths: [
        operand.base.path + "." + String(key.value),
      ],
      deferred: false,
    };
  }

  const keyDependencies = leafOperandPaths(operand.key);
  return {
    paths: [...new Set(keyDependencies)].sort(),
    deferred: true,
  };
}

export function planGameplayOutcomeRuntimeObservations(
  model: GameplayIntentModel,
  outcomeId: string,
  values: Readonly<Record<string, unknown>>,
): GameplayRuntimeObservationNeed[] {
  const needs = new Map<
    string,
    GameplayRuntimeObservationNeed
  >();

  for (const requirement of gameplayOutcomePolicyRequirements(
    model,
    outcomeId,
  )) {
    const unresolved = unresolvedGameplayPolicyOperands(
      requirement.predicate,
      values,
    );

    for (const operand of unresolved) {
      const expression =
        describeGameplayPolicyOperand(operand);
      const observation =
        observationPathsForOperand(operand, values);
      const key =
        requirement.policyId + "::" + expression;

      needs.set(key, {
        policyId: requirement.policyId,
        expression,
        operand,
        paths: observation.paths,
        deferred: observation.deferred,
      });
    }
  }

  return [...needs.values()].sort((a, b) =>
    a.policyId.localeCompare(b.policyId) ||
    a.expression.localeCompare(b.expression)
  );
}
