export interface BoundedExplorerOptions {
  maxDepth: number;
  maxStates: number;
  stopOnFirstFailure?: boolean;
}

export interface StateTransition<TAction> {
  fromStateId: string;
  toStateId: string;
  action: TAction;
  noOp: boolean;
}

export interface StateFailure<TState, TAction, TFailure> {
  stateId: string;
  state: TState;
  trace: readonly TAction[];
  failure: TFailure;
  depth: number;
}

export interface BoundedExplorerDomain<TState, TAction, TFailure> {
  initialState(): TState;
  stateId(state: TState): string;
  actions(state: TState, depth: number): readonly TAction[];
  apply(state: TState, action: TAction): TState;
  check(state: TState): TFailure | undefined;
  actionKey(action: TAction): string;
}

export interface BoundedExplorerResult<TState, TAction, TFailure> {
  statesExplored: number;
  transitionsExplored: number;
  uniqueTransitions: number;
  maxDepthReached: number;
  truncated: boolean;
  failures: StateFailure<TState, TAction, TFailure>[];
  visitedStateIds: string[];
  transitions: StateTransition<TAction>[];
}

interface QueueEntry<TState, TAction> {
  state: TState;
  stateId: string;
  depth: number;
  trace: TAction[];
}

export function exploreBoundedStateSpace<TState, TAction, TFailure>(
  domain: BoundedExplorerDomain<TState, TAction, TFailure>,
  options: BoundedExplorerOptions,
): BoundedExplorerResult<TState, TAction, TFailure> {
  if (!Number.isInteger(options.maxDepth) || options.maxDepth < 0) {
    throw new Error("maxDepth must be a non-negative integer.");
  }
  if (!Number.isInteger(options.maxStates) || options.maxStates < 1) {
    throw new Error("maxStates must be a positive integer.");
  }

  const initial = domain.initialState();
  const initialId = domain.stateId(initial);
  const visited = new Set<string>([initialId]);
  const transitionIds = new Set<string>();
  const transitions: StateTransition<TAction>[] = [];
  const failures: StateFailure<TState, TAction, TFailure>[] = [];
  const queue: QueueEntry<TState, TAction>[] = [{
    state: initial,
    stateId: initialId,
    depth: 0,
    trace: [],
  }];

  let transitionsExplored = 0;
  let maxDepthReached = 0;
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    maxDepthReached = Math.max(maxDepthReached, current.depth);

    const failure = domain.check(current.state);
    if (failure !== undefined) {
      failures.push({
        stateId: current.stateId,
        state: current.state,
        trace: current.trace,
        failure,
        depth: current.depth,
      });
      if (options.stopOnFirstFailure) break;
    }

    if (current.depth >= options.maxDepth) continue;

    const actions = [...domain.actions(current.state, current.depth)]
      .sort((a, b) => domain.actionKey(a).localeCompare(domain.actionKey(b)));

    for (const action of actions) {
      transitionsExplored += 1;
      const next = domain.apply(current.state, action);
      const nextId = domain.stateId(next);
      const noOp = nextId === current.stateId;
      const transitionId = [
        current.stateId,
        domain.actionKey(action),
        nextId,
      ].join("=>");
      transitionIds.add(transitionId);
      transitions.push({
        fromStateId: current.stateId,
        toStateId: nextId,
        action,
        noOp,
      });

      if (noOp || visited.has(nextId)) continue;
      if (visited.size >= options.maxStates) {
        truncated = true;
        continue;
      }

      visited.add(nextId);
      queue.push({
        state: next,
        stateId: nextId,
        depth: current.depth + 1,
        trace: [...current.trace, action],
      });
    }
  }

  if (queue.length > 0) truncated = true;

  return {
    statesExplored: visited.size,
    transitionsExplored,
    uniqueTransitions: transitionIds.size,
    maxDepthReached,
    truncated,
    failures,
    visitedStateIds: [...visited].sort(),
    transitions,
  };
}
