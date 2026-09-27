import type {
  BehavioralWorldModel,
  BehaviorPredicate,
  BehaviorState,
} from "../../behavior-model/src/index.js";

export type SolverDisposition =
  | "proved"
  | "disproved"
  | "unknown";

export type SolverQuery =
  | {
      id: string;
      kind: "reachability";
      target: BehaviorPredicate;
      description?: string;
    }
  | {
      id: string;
      kind: "invariant";
      predicate: BehaviorPredicate;
      description?: string;
    };

export interface SolverBudget {
  maxDepth: number;
  maxStates: number;
}

export interface ConstraintProblem {
  id: string;
  model: BehavioralWorldModel;
  initialState: BehaviorState;
  query: SolverQuery;
  budget: SolverBudget;
}

export interface SolverTraceStep {
  depth: number;
  state: BehaviorState;
  viaTransitionId?: string;
}

export interface SolverProof {
  completeExploration: boolean;
  transitionIds: readonly string[];
  exploredStates: number;
  maxDepthReached: number;
}

export interface SolverResult {
  problemId: string;
  queryId: string;
  disposition: SolverDisposition;
  reason: string;
  proof: SolverProof;
  trace?: readonly SolverTraceStep[];
}

export interface SolverBackend {
  readonly id: string;
  solve(problem: ConstraintProblem): SolverResult;
}
