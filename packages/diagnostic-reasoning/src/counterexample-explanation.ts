import {
  behaviorStateKey,
  evaluateBehaviorPredicate,
  type BehavioralWorldModel,
  type BehaviorPredicate,
  type BehaviorState,
} from "../../behavior-model/src/index.js";
import type {
  SolverQuery,
  SolverTraceStep,
} from "../../logic-solver/src/index.js";

export type CounterexampleExplanationStrength =
  | "initial-state-contradiction"
  | "direct-state-contradiction"
  | "transition-context-only";

export interface CounterexampleCausalExplanation {
  queryId: string;
  violationDepth: number;
  violationTick: number;
  transitionId?: string;
  transitionOwner?: string;
  changedStateKeys: readonly string[];
  predicateStateKeys: readonly string[];
  directConflictStateKeys: readonly string[];
  strength: CounterexampleExplanationStrength;
  chain: readonly string[];
}

function predicateStateKeys(
  predicate: BehaviorPredicate,
  output = new Set<string>(),
): Set<string> {
  switch (predicate.kind) {
    case "condition":
      output.add(
        behaviorStateKey(
          predicate.condition.variableId,
          predicate.condition.scopeKey,
        ),
      );
      break;
    case "all":
    case "any":
      for (const item of predicate.predicates) {
        predicateStateKeys(item, output);
      }
      break;
    case "not":
      predicateStateKeys(predicate.predicate, output);
      break;
    case "implies":
      predicateStateKeys(predicate.if, output);
      predicateStateKeys(predicate.then, output);
      break;
  }
  return output;
}

function changedKeys(
  before: BehaviorState,
  after: BehaviorState,
): readonly string[] {
  const keys = new Set([
    ...Object.keys(before.values),
    ...Object.keys(after.values),
  ]);
  return [...keys]
    .filter(
      (key) =>
        before.values[key] !== after.values[key] ||
        Object.prototype.hasOwnProperty.call(before.values, key) !==
          Object.prototype.hasOwnProperty.call(after.values, key),
    )
    .sort();
}

export function explainInvariantCounterexample(
  model: BehavioralWorldModel,
  query: SolverQuery,
  trace: readonly SolverTraceStep[],
): CounterexampleCausalExplanation {
  if (query.kind !== "invariant") {
    throw new Error(
      "Counterexample causal explanation currently requires an invariant query.",
    );
  }
  if (trace.length === 0) {
    throw new Error(
      "Counterexample causal explanation requires a non-empty trace.",
    );
  }

  const violationIndex = trace.findIndex(
    (step) =>
      !evaluateBehaviorPredicate(
        step.state,
        query.predicate,
      ),
  );
  if (violationIndex < 0) {
    throw new Error(
      "Trace does not contain a state that violates the invariant query.",
    );
  }

  const violation = trace[violationIndex]!;
  const relevant = [...predicateStateKeys(query.predicate)].sort();

  if (violationIndex === 0) {
    return {
      queryId: query.id,
      violationDepth: violation.depth,
      violationTick: violation.state.tick,
      changedStateKeys: [],
      predicateStateKeys: relevant,
      directConflictStateKeys: relevant,
      strength: "initial-state-contradiction",
      chain: [
        "Initial state already contradicts the invariant.",
        "Contradiction references: " + relevant.join(", "),
      ],
    };
  }

  const previous = trace[violationIndex - 1]!;
  const changed = changedKeys(previous.state, violation.state);
  const direct = changed.filter((key) => relevant.includes(key));
  const transition = violation.viaTransitionId === undefined
    ? undefined
    : model.transitions.find(
        (candidate) =>
          candidate.id === violation.viaTransitionId,
      );

  const strength: CounterexampleExplanationStrength =
    direct.length > 0
      ? "direct-state-contradiction"
      : "transition-context-only";

  const chain = [
    violation.viaTransitionId === undefined
      ? "A state transition produced the first invariant violation."
      : "Transition " + violation.viaTransitionId +
        " produced the first invariant violation.",
    changed.length === 0
      ? "No scalar state-key delta was observed at the violating step."
      : "Changed state keys: " + changed.join(", "),
    direct.length === 0
      ? "No changed key directly overlaps the invariant predicate; the transition is context, not a proven root cause."
      : "Direct contradiction keys: " + direct.join(", "),
  ];

  return {
    queryId: query.id,
    violationDepth: violation.depth,
    violationTick: violation.state.tick,
    ...(violation.viaTransitionId === undefined
      ? {}
      : { transitionId: violation.viaTransitionId }),
    ...(transition === undefined
      ? {}
      : { transitionOwner: transition.owner }),
    changedStateKeys: changed,
    predicateStateKeys: relevant,
    directConflictStateKeys: direct,
    strength,
    chain,
  };
}
