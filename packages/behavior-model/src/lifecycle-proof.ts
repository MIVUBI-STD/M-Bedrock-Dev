export interface LifecycleProofTransition {
  id: string;
  from: string;
  to: string;
  trigger?: string;
}

export interface LifecycleReleaseContract {
  activeStates: readonly string[];
  releaseStates: readonly string[];
  terminalTriggers: readonly string[];
}

export interface LifecycleReleaseViolation {
  transitionId: string;
  trigger: string;
  from: string;
  to: string;
  reason:
    | "terminal-target-can-dead-end"
    | "terminal-target-can-cycle-without-release";
}

export interface LifecycleReleaseProof {
  status: "proven" | "violated" | "unknown";
  inevitableReleaseStates: readonly string[];
  checkedTerminalTransitions: readonly string[];
  violations: readonly LifecycleReleaseViolation[];
}

function reachableFrom(
  starts: readonly string[],
  transitions: readonly LifecycleProofTransition[],
): Set<string> {
  const byFrom = new Map<string, LifecycleProofTransition[]>();
  for (const transition of transitions) {
    const bucket = byFrom.get(transition.from) ?? [];
    bucket.push(transition);
    byFrom.set(transition.from, bucket);
  }

  const visited = new Set<string>();
  const queue = [...starts];
  while (queue.length > 0) {
    const state = queue.shift()!;
    if (visited.has(state)) continue;
    visited.add(state);
    for (const transition of byFrom.get(state) ?? []) {
      queue.push(transition.to);
    }
  }
  return visited;
}

export function proveLifecycleRelease(
  transitions: readonly LifecycleProofTransition[],
  contract: LifecycleReleaseContract,
): LifecycleReleaseProof {
  const reachable = reachableFrom(contract.activeStates, transitions);
  const release = new Set(contract.releaseStates);
  const byFrom = new Map<string, LifecycleProofTransition[]>();

  for (const transition of transitions) {
    if (!reachable.has(transition.from)) continue;
    const bucket = byFrom.get(transition.from) ?? [];
    bucket.push(transition);
    byFrom.set(transition.from, bucket);
  }

  const inevitable = new Set(release);
  let changed = true;
  while (changed) {
    changed = false;
    for (const state of reachable) {
      if (inevitable.has(state)) continue;
      const outgoing = byFrom.get(state) ?? [];
      if (
        outgoing.length > 0 &&
        outgoing.every((transition) => inevitable.has(transition.to))
      ) {
        inevitable.add(state);
        changed = true;
      }
    }
  }

  const terminal = transitions.filter(
    (transition) =>
      transition.trigger !== undefined &&
      contract.terminalTriggers.includes(transition.trigger) &&
      reachable.has(transition.from),
  );

  if (terminal.length === 0) {
    return {
      status: "unknown",
      inevitableReleaseStates: [...inevitable].sort(),
      checkedTerminalTransitions: [],
      violations: [],
    };
  }

  const violations: LifecycleReleaseViolation[] = [];
  for (const transition of terminal) {
    if (inevitable.has(transition.to)) continue;
    const outgoing = byFrom.get(transition.to) ?? [];
    violations.push({
      transitionId: transition.id,
      trigger: transition.trigger!,
      from: transition.from,
      to: transition.to,
      reason:
        outgoing.length === 0
          ? "terminal-target-can-dead-end"
          : "terminal-target-can-cycle-without-release",
    });
  }

  return {
    status: violations.length === 0 ? "proven" : "violated",
    inevitableReleaseStates: [...inevitable].sort(),
    checkedTerminalTransitions: terminal.map((item) => item.id).sort(),
    violations,
  };
}
