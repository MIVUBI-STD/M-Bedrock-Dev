import {
  applyBehaviorTransition,
  evaluateBehaviorPredicate,
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

interface LeadsToMonitor {
  open: boolean;
  age: number;
}

interface LeadsToPathNode extends PathNode {
  monitor: LeadsToMonitor;
  productPath: readonly string[];
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

function updateLeadsToMonitor(
  state: BehaviorState,
  property: Extract<TemporalProperty, { kind: "leads-to" }>,
  previous?: LeadsToMonitor,
): LeadsToMonitor {
  const consequence = evaluateBehaviorPredicate(
    state,
    property.consequence,
  );
  if (consequence) {
    return { open: false, age: 0 };
  }

  const trigger = evaluateBehaviorPredicate(
    state,
    property.trigger,
  );

  if (previous?.open) {
    return {
      open: true,
      age: previous.age + 1,
    };
  }

  return trigger
    ? { open: true, age: 0 }
    : { open: false, age: 0 };
}

function monitorIdentity(
  state: BehaviorState,
  monitor: LeadsToMonitor,
): string {
  return canonicalState(state) +
    "|obligation:" +
    (monitor.open ? "open:" + monitor.age : "closed");
}

function solveLeadsToProperty(
  model: BehavioralWorldModel,
  initialState: BehaviorState,
  property: Extract<TemporalProperty, { kind: "leads-to" }>,
  budget: SolverBudget,
): TemporalSolverResult {
  const initialMonitor = updateLeadsToMonitor(
    initialState,
    property,
  );
  const initialTrace: readonly SolverTraceStep[] = [{
    depth: 0,
    state: initialState,
  }];
  const initialProduct = monitorIdentity(
    initialState,
    initialMonitor,
  );
  const queue: LeadsToPathNode[] = [{
    state: initialState,
    depth: 0,
    trace: initialTrace,
    semanticPath: [canonicalState(initialState)],
    monitor: initialMonitor,
    productPath: [initialProduct],
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

    if (
      node.monitor.open &&
      property.withinTicks !== undefined &&
      node.monitor.age >= property.withinTicks
    ) {
      return temporalResult(
        property,
        "disproved",
        "A LEADS-TO obligation exceeded its deadline.",
        exploredPaths,
        maxDepthReached,
        false,
        node.trace,
      );
    }

    const successors = enabledSuccessors(model, node.state);
    if (successors.length === 0) {
      if (node.monitor.open) {
        return temporalResult(
          property,
          "disproved",
          "A terminal execution leaves a LEADS-TO obligation unresolved.",
          exploredPaths,
          maxDepthReached,
          false,
          node.trace,
        );
      }
      continue;
    }

    if (node.depth >= budget.maxDepth) {
      incomplete = true;
      continue;
    }

    for (const successor of successors) {
      const nextMonitor = updateLeadsToMonitor(
        successor.state,
        property,
        node.monitor,
      );
      const nextTrace: readonly SolverTraceStep[] = [
        ...node.trace,
        {
          depth: node.depth + 1,
          state: successor.state,
          viaTransitionId: successor.transitionId,
        },
      ];
      const product = monitorIdentity(
        successor.state,
        nextMonitor,
      );

      if (node.productPath.includes(product)) {
        if (nextMonitor.open) {
          return temporalResult(
            property,
            "disproved",
            "A reachable product-state cycle repeats with an outstanding LEADS-TO obligation.",
            exploredPaths,
            Math.max(maxDepthReached, node.depth + 1),
            false,
            nextTrace,
          );
        }
        continue;
      }

      queue.push({
        state: successor.state,
        depth: node.depth + 1,
        trace: nextTrace,
        semanticPath: [
          ...node.semanticPath,
          canonicalState(successor.state),
        ],
        monitor: nextMonitor,
        productPath: [...node.productPath, product],
      });
    }
  }

  if (incomplete) {
    return temporalResult(
      property,
      "unknown",
      "LEADS-TO monitor exploration hit a search boundary before all product-state paths were resolved.",
      exploredPaths,
      maxDepthReached,
      false,
    );
  }

  return temporalResult(
    property,
    "proved",
    "Every reachable LEADS-TO obligation was discharged across the exhausted product-state path space.",
    exploredPaths,
    maxDepthReached,
    true,
  );
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

  if (property.kind === "leads-to") {
    return solveLeadsToProperty(
      model,
      initialState,
      property,
      budget,
    );
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

    if (prefixEvaluation.disposition === "satisfied") {
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
      const nextTrace: readonly SolverTraceStep[] = [
        ...node.trace,
        {
          depth: node.depth + 1,
          state: successor.state,
          viaTransitionId: successor.transitionId,
        },
      ];

      if (node.semanticPath.includes(identity)) {
        const loopEvaluation = evaluateTemporalProperty(
          behaviorTrace(nextTrace, false),
          property,
        );

        if (loopEvaluation.disposition === "satisfied") {
          continue;
        }

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
