import {
  applyBehaviorTransition,
  evaluateTemporalProperty,
  type BehavioralWorldModel,
  type BehaviorState,
  type BehaviorTrace,
  type TemporalProperty,
} from "../../behavior-model/src/index.js";
import type {
  SolverBudget,
  SolverDisposition,
  SolverTraceStep,
} from "./types.js";

export type SolvableTemporalProperty = Exclude<
  TemporalProperty,
  { kind: "always" }
>;

export interface TemporalProof {
  completeExploration: boolean;
  exploredPaths: number;
  maxDepthReached: number;
}

export interface TemporalSolverResult {
  propertyId: string;
  disposition: SolverDisposition;
  reason: string;
  proof: TemporalProof;
  trace?: readonly SolverTraceStep[];
}

interface PathNode {
  state: BehaviorState;
  depth: number;
  trace: readonly SolverTraceStep[];
  semanticPath: readonly string[];
}

function canonicalState(state: BehaviorState): string {
  return JSON.stringify(
    Object.keys(state.values)
      .sort()
      .map((key) => [key, state.values[key]]),
  );
}

function behaviorTrace(
  trace: readonly SolverTraceStep[],
  complete: boolean,
): BehaviorTrace {
  return {
    schemaVersion: 1,
    states: trace.map((step) => step.state),
    complete,
  };
}

function enabledSuccessors(
  model: BehavioralWorldModel,
  state: BehaviorState,
): readonly {
  transitionId: string;
  state: BehaviorState;
}[] {
  const output: {
    transitionId: string;
    state: BehaviorState;
  }[] = [];

  for (const transition of model.transitions) {
    const application = applyBehaviorTransition(
      state,
      transition,
      state.tick + 1,
    );
    if (!application.enabled) continue;
    output.push({
      transitionId: transition.id,
      state: application.state,
    });
  }

  return output;
}

function temporalResult(
  property: SolvableTemporalProperty,
  disposition: SolverDisposition,
  reason: string,
  exploredPaths: number,
  maxDepthReached: number,
  completeExploration: boolean,
  trace?: readonly SolverTraceStep[],
): TemporalSolverResult {
  return {
    propertyId: property.id,
    disposition,
    reason,
    proof: {
      completeExploration,
      exploredPaths,
      maxDepthReached,
    },
    ...(trace === undefined ? {} : { trace }),
  };
}

export function solveTemporalProperty(
  model: BehavioralWorldModel,
  initialState: BehaviorState,
  property: SolvableTemporalProperty,
  budget: SolverBudget,
): TemporalSolverResult {
  if (!Number.isInteger(budget.maxDepth) || budget.maxDepth < 0) {
    throw new Error("Temporal solver maxDepth must be a non-negative integer.");
  }
  if (!Number.isInteger(budget.maxStates) || budget.maxStates < 1) {
    throw new Error("Temporal solver maxStates must be a positive integer.");
  }

  const initialIdentity = canonicalState(initialState);
  const initialTrace: readonly SolverTraceStep[] = [{
    depth: 0,
    state: initialState,
  }];
  const queue: PathNode[] = [{
    state: initialState,
    depth: 0,
    trace: initialTrace,
    semanticPath: [initialIdentity],
  }];

  let cursor = 0;
  let exploredPaths = 0;
  let maxDepthReached = 0;
  let incomplete = false;

  while (cursor < queue.length) {
    if (exploredPaths >= budget.maxStates) {
      incomplete = true;
      break;
    }

    const node = queue[cursor++]!;
    exploredPaths += 1;
    maxDepthReached = Math.max(maxDepthReached, node.depth);

    const prefixEvaluation = evaluateTemporalProperty(
      behaviorTrace(node.trace, false),
      property,
    );

    if (prefixEvaluation.disposition === "violated") {
      return temporalResult(
        property,
        "disproved",
        prefixEvaluation.reason,
        exploredPaths,
        maxDepthReached,
        false,
        node.trace,
      );
    }

    if (
      prefixEvaluation.disposition === "satisfied" &&
      (property.kind === "eventually" || property.kind === "until")
    ) {
      continue;
    }

    const successors = enabledSuccessors(model, node.state);

    if (successors.length === 0) {
      const terminalEvaluation = evaluateTemporalProperty(
        behaviorTrace(node.trace, true),
        property,
      );
      if (terminalEvaluation.disposition === "violated") {
        return temporalResult(
          property,
          "disproved",
          terminalEvaluation.reason,
          exploredPaths,
          maxDepthReached,
          false,
          node.trace,
        );
      }
      if (terminalEvaluation.disposition !== "satisfied") {
        incomplete = true;
      }
      continue;
    }

    if (node.depth >= budget.maxDepth) {
      incomplete = true;
      continue;
    }

    for (const successor of successors) {
      const identity = canonicalState(successor.state);
      const loopIndex = node.semanticPath.indexOf(identity);
      const nextTrace: readonly SolverTraceStep[] = [
        ...node.trace,
        {
          depth: node.depth + 1,
          state: successor.state,
          viaTransitionId: successor.transitionId,
        },
      ];

      if (loopIndex >= 0) {
        const loopEvaluation = evaluateTemporalProperty(
          behaviorTrace(nextTrace, false),
          property,
        );

        if (
          loopEvaluation.disposition === "satisfied" &&
          (property.kind === "eventually" || property.kind === "until")
        ) {
          continue;
        }

        if (
          property.kind === "eventually" ||
          property.kind === "until"
        ) {
          return temporalResult(
            property,
            "disproved",
            "A reachable cycle can repeat indefinitely without discharging the temporal obligation.",
            exploredPaths,
            Math.max(maxDepthReached, node.depth + 1),
            false,
            nextTrace,
          );
        }

        // A LEADS-TO cycle may discharge an obligation across the loop
        // boundary, so v2 refuses to turn a lasso into either proof or
        // counterexample without a monitor automaton.
        incomplete = true;
        continue;
      }

      queue.push({
        state: successor.state,
        depth: node.depth + 1,
        trace: nextTrace,
        semanticPath: [...node.semanticPath, identity],
      });
    }
  }

  if (incomplete) {
    return temporalResult(
      property,
      "unknown",
      "Temporal exploration ended with unresolved paths or a search budget boundary; no universal proof is claimed.",
      exploredPaths,
      maxDepthReached,
      false,
    );
  }

  return temporalResult(
    property,
    "proved",
    "Every explored execution path discharged the temporal obligation and the relevant path space was exhausted.",
    exploredPaths,
    maxDepthReached,
    true,
  );
}

export function solveTemporalProperties(
  model: BehavioralWorldModel,
  initialState: BehaviorState,
  properties: readonly SolvableTemporalProperty[],
  budget: SolverBudget,
): readonly TemporalSolverResult[] {
  return properties.map((property) =>
    solveTemporalProperty(
      model,
      initialState,
      property,
      budget,
    )
  );
}
