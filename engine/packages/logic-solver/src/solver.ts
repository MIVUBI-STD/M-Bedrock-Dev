import {
  applyBehaviorTransition,
  evaluateBehaviorPredicate,
  type BehaviorState,
} from "../../behavior-model/src/index.js";
import type {
  ConstraintProblem,
  SolverBackend,
  SolverResult,
  SolverTraceStep,
} from "./types.js";

interface SearchNode {
  state: BehaviorState;
  depth: number;
  trace: readonly SolverTraceStep[];
}

function assertProblem(problem: ConstraintProblem): void {
  if (problem.initialState.schemaVersion !== 1) {
    throw new Error("Logic solver requires BehaviorState schemaVersion 1.");
  }
  if (!Number.isInteger(problem.budget.maxDepth) || problem.budget.maxDepth < 0) {
    throw new Error("Logic solver maxDepth must be a non-negative integer.");
  }
  if (!Number.isInteger(problem.budget.maxStates) || problem.budget.maxStates < 1) {
    throw new Error("Logic solver maxStates must be a positive integer.");
  }
}

function canonicalState(state: BehaviorState): string {
  const ordered = Object.keys(state.values)
    .sort()
    .map((key) => [key, state.values[key]]);
  return JSON.stringify(ordered);
}

function querySatisfied(problem: ConstraintProblem, state: BehaviorState): boolean {
  return problem.query.kind === "reachability"
    ? evaluateBehaviorPredicate(state, problem.query.target)
    : evaluateBehaviorPredicate(state, problem.query.predicate);
}

function transitionIds(trace: readonly SolverTraceStep[]): readonly string[] {
  return trace
    .map((step) => step.viaTransitionId)
    .filter((id): id is string => id !== undefined);
}

function result(
  problem: ConstraintProblem,
  disposition: SolverResult["disposition"],
  reason: string,
  exploredStates: number,
  maxDepthReached: number,
  completeExploration: boolean,
  trace?: readonly SolverTraceStep[],
): SolverResult {
  return {
    problemId: problem.id,
    queryId: problem.query.id,
    disposition,
    reason,
    proof: {
      completeExploration,
      transitionIds: trace ? transitionIds(trace) : [],
      exploredStates,
      maxDepthReached,
    },
    ...(trace === undefined ? {} : { trace }),
  };
}

export class BoundedBehaviorSolver implements SolverBackend {
  readonly id = "bounded-behavior-v1";

  solve(problem: ConstraintProblem): SolverResult {
    assertProblem(problem);

    const initialTrace: readonly SolverTraceStep[] = [{
      depth: 0,
      state: problem.initialState,
    }];
    const queue: SearchNode[] = [{
      state: problem.initialState,
      depth: 0,
      trace: initialTrace,
    }];
    const seen = new Set<string>([canonicalState(problem.initialState)]);
    let cursor = 0;
    let truncated = false;
    let maxDepthReached = 0;

    while (cursor < queue.length) {
      const node = queue[cursor++]!;
      maxDepthReached = Math.max(maxDepthReached, node.depth);
      const satisfied = querySatisfied(problem, node.state);

      if (problem.query.kind === "reachability" && satisfied) {
        return result(
          problem,
          "proved",
          "Target predicate is reachable; trace is the shortest transition witness under breadth-first exploration.",
          seen.size,
          maxDepthReached,
          false,
          node.trace,
        );
      }

      if (problem.query.kind === "invariant" && !satisfied) {
        return result(
          problem,
          "disproved",
          "Invariant is violated by a reachable state; trace is the shortest counterexample under breadth-first exploration.",
          seen.size,
          maxDepthReached,
          false,
          node.trace,
        );
      }

      for (const transition of problem.model.transitions) {
        const application = applyBehaviorTransition(
          node.state,
          transition,
          node.state.tick + 1,
        );
        if (!application.enabled) continue;

        const identity = canonicalState(application.state);
        if (seen.has(identity)) continue;

        if (node.depth >= problem.budget.maxDepth) {
          truncated = true;
          continue;
        }

        if (seen.size >= problem.budget.maxStates) {
          truncated = true;
          continue;
        }

        seen.add(identity);
        queue.push({
          state: application.state,
          depth: node.depth + 1,
          trace: [
            ...node.trace,
            {
              depth: node.depth + 1,
              state: application.state,
              viaTransitionId: transition.id,
            },
          ],
        });
      }
    }

    if (truncated) {
      return result(
        problem,
        "unknown",
        "Search budget truncated at least one unexplored reachable successor; absence of a witness is not proof.",
        seen.size,
        maxDepthReached,
        false,
      );
    }

    return problem.query.kind === "reachability"
      ? result(
          problem,
          "disproved",
          "Reachable semantic state space was exhausted without satisfying the target predicate.",
          seen.size,
          maxDepthReached,
          true,
        )
      : result(
          problem,
          "proved",
          "Reachable semantic state space was exhausted and every explored state satisfied the invariant.",
          seen.size,
          maxDepthReached,
          true,
        );
  }
}

export const boundedBehaviorSolver = new BoundedBehaviorSolver();
