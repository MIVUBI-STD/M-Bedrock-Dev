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
import {
  solveTemporalProperties,
  type TemporalSolverResult,
} from "./temporal-solver.js";

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
  temporalResults: readonly TemporalSolverResult[];
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
        ...(property.description === undefined
          ? {}
          : { description: property.description }),
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

    // Temporal Solver v2 owns EVENTUALLY, LEADS-TO, and UNTIL.
    // They are evaluated over execution paths rather than weakened into
    // single-state predicates.
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
    temporalResults: [],
    unsupported: compilation.unsupported,
  };
}

export function compileAndSolveBehaviorConstraints(
  model: BehavioralWorldModel,
  initialState: BehaviorState,
  budget: SolverBudget,
): ConstraintBatchResult {
  const compiled = solveCompiledBehaviorConstraints(
    compileBehaviorConstraints(
      model,
      initialState,
      budget,
    ),
  );
  return {
    ...compiled,
    temporalResults: solveTemporalProperties(
      model,
      initialState,
      model.properties.filter(
        (property): property is Exclude<
          TemporalProperty,
          { kind: "always" }
        > => property.kind !== "always",
      ),
      budget,
    ),
  };
}
