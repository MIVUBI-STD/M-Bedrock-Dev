import type {
  BehavioralWorldModel,
  BehaviorPredicate,
  BehaviorState,
  TemporalProperty,
} from "../../behavior-model/src/index.js";
import type {
  ConstraintProblem,
  SolverBudget,
  SolverResult,
} from "./types.js";
import {
  boundedBehaviorSolver,
} from "./solver.js";

export type CompiledConstraintKind =
  | "temporal-invariant"
  | "transition-enablement";

export interface CompiledConstraint {
  id: string;
  kind: CompiledConstraintKind;
  sourceId: string;
  problem: ConstraintProblem;
}

export interface UnsupportedConstraint {
  sourceId: string;
  sourceKind: TemporalProperty["kind"];
  reason: string;
}

export interface ConstraintCompilation {
  modelId: string;
  constraints: readonly CompiledConstraint[];
  unsupported: readonly UnsupportedConstraint[];
}

export interface ConstraintBatchResult {
  modelId: string;
  results: readonly {
    constraint: CompiledConstraint;
    result: SolverResult;
  }[];
  unsupported: readonly UnsupportedConstraint[];
}

function invariantProblem(
  model: BehavioralWorldModel,
  initialState: BehaviorState,
  property: Extract<TemporalProperty, { kind: "always" }>,
  budget: SolverBudget,
): CompiledConstraint {
  const id = "property:" + property.id;
  return {
    id,
    kind: "temporal-invariant",
    sourceId: property.id,
    problem: {
      id: model.id + ":" + id,
      model,
      initialState,
      query: {
        id,
        kind: "invariant",
        predicate: property.predicate,
        description: property.description,
      },
      budget,
    },
  };
}

function transitionPrecondition(
  transition: BehavioralWorldModel["transitions"][number],
): BehaviorPredicate {
  return {
    kind: "all",
    predicates: transition.preconditions,
  };
}

function enablementProblem(
  model: BehavioralWorldModel,
  initialState: BehaviorState,
  transition: BehavioralWorldModel["transitions"][number],
  budget: SolverBudget,
): CompiledConstraint {
  const id = "transition-enabled:" + transition.id;
  return {
    id,
    kind: "transition-enablement",
    sourceId: transition.id,
    problem: {
      id: model.id + ":" + id,
      model,
      initialState,
      query: {
        id,
        kind: "reachability",
        target: transitionPrecondition(transition),
        description:
          "Checks whether the transition preconditions are reachable from the supplied initial state.",
      },
      budget,
    },
  };
}

export function compileBehaviorConstraints(
  model: BehavioralWorldModel,
  initialState: BehaviorState,
  budget: SolverBudget,
): ConstraintCompilation {
  const constraints: CompiledConstraint[] = [];
  const unsupported: UnsupportedConstraint[] = [];

  for (const property of model.properties) {
    if (property.kind === "always") {
      constraints.push(
        invariantProblem(model, initialState, property, budget),
      );
      continue;
    }

    unsupported.push({
      sourceId: property.id,
      sourceKind: property.kind,
      reason:
        "Logic Solver v1 does not yet translate open-ended temporal obligations into bounded proof claims.",
    });
  }

  for (const transition of model.transitions) {
    constraints.push(
      enablementProblem(model, initialState, transition, budget),
    );
  }

  return {
    modelId: model.id,
    constraints,
    unsupported,
  };
}

export function solveCompiledBehaviorConstraints(
  compilation: ConstraintCompilation,
): ConstraintBatchResult {
  return {
    modelId: compilation.modelId,
    results: compilation.constraints.map((constraint) => ({
      constraint,
      result: boundedBehaviorSolver.solve(constraint.problem),
    })),
    unsupported: compilation.unsupported,
  };
}

export function compileAndSolveBehaviorConstraints(
  model: BehavioralWorldModel,
  initialState: BehaviorState,
  budget: SolverBudget,
): ConstraintBatchResult {
  return solveCompiledBehaviorConstraints(
    compileBehaviorConstraints(
      model,
      initialState,
      budget,
    ),
  );
}
