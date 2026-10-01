import {
  applyBehaviorTransition,
  evaluateBehaviorPredicate,
  type BehaviorState,
} from "../../../behavior-model/src/index.js";
import type {
  ConstraintProblem,
  SolverResult,
  SolverTraceStep,
} from "../../../logic-solver/src/index.js";
import { ddmin } from "./minimize.js";

export interface MinimizedInvariantCounterexample {
  transitionIds: readonly string[];
  trace: readonly SolverTraceStep[];
  evaluations: number;
  originalTransitions: number;
  minimizedTransitions: number;
}

function transitionSequence(
  result: SolverResult,
): readonly string[] {
  return result.trace
    ?.map((step) => step.viaTransitionId)
    .filter((id): id is string => id !== undefined) ?? [];
}

function replayInvariantSequence(
  problem: ConstraintProblem,
  transitionIds: readonly string[],
): {
  violates: boolean;
  trace: readonly SolverTraceStep[];
} {
  if (problem.query.kind !== "invariant") {
    throw new Error(
      "Invariant counterexample minimization requires an invariant query.",
    );
  }

  let state: BehaviorState = problem.initialState;
  const trace: SolverTraceStep[] = [{
    depth: 0,
    state,
  }];

  if (!evaluateBehaviorPredicate(state, problem.query.predicate)) {
    return { violates: true, trace };
  }

  for (let index = 0; index < transitionIds.length; index += 1) {
    const transitionId = transitionIds[index]!;
    const transition = problem.model.transitions.find(
      (candidate) => candidate.id === transitionId,
    );
    if (!transition) {
      return { violates: false, trace };
    }

    const application = applyBehaviorTransition(
      state,
      transition,
      state.tick + 1,
    );
    if (!application.enabled) {
      return { violates: false, trace };
    }

    state = application.state;
    trace.push({
      depth: index + 1,
      state,
      viaTransitionId: transitionId,
    });

    if (!evaluateBehaviorPredicate(state, problem.query.predicate)) {
      return { violates: true, trace };
    }
  }

  return { violates: false, trace };
}

export async function minimizeInvariantCounterexample(
  problem: ConstraintProblem,
  result: SolverResult,
): Promise<MinimizedInvariantCounterexample> {
  if (problem.query.kind !== "invariant") {
    throw new Error(
      "Invariant counterexample minimization requires an invariant query.",
    );
  }
  if (result.disposition !== "disproved") {
    throw new Error(
      "Counterexample minimization requires a disproved solver result.",
    );
  }

  const original = transitionSequence(result);
  const initialReplay = replayInvariantSequence(problem, []);

  if (initialReplay.violates) {
    return {
      transitionIds: [],
      trace: initialReplay.trace,
      evaluations: 0,
      originalTransitions: original.length,
      minimizedTransitions: 0,
    };
  }

  const fullReplay = replayInvariantSequence(problem, original);
  if (!fullReplay.violates) {
    throw new Error(
      "Solver counterexample transition sequence does not reproduce the invariant violation.",
    );
  }

  if (original.length <= 1) {
    return {
      transitionIds: original,
      trace: fullReplay.trace,
      evaluations: 1,
      originalTransitions: original.length,
      minimizedTransitions: original.length,
    };
  }

  const minimized = await ddmin(
    original,
    (candidate) =>
      replayInvariantSequence(problem, candidate).violates,
  );
  const replay = replayInvariantSequence(
    problem,
    minimized.minimized,
  );

  return {
    transitionIds: minimized.minimized,
    trace: replay.trace,
    evaluations: minimized.evaluations,
    originalTransitions: minimized.originalLength,
    minimizedTransitions: minimized.minimizedLength,
  };
}
