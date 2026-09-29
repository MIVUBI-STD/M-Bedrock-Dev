import type {
  ParsedScriptFile,
  ScriptArenaAuthorityPath,
} from "../../../analyzers/scripts/src/index.js";

export type ArenaLifecycleConvergenceStatus =
  | "proven"
  | "partial"
  | "unresolved";

export interface ArenaLifecycleScopeAssessment {
  arenaExpression: string;
  membershipRelease: boolean;
  generationInvalidation: boolean;
  status: ArenaLifecycleConvergenceStatus;
}

export interface ArenaLifecycleTerminalAssessment {
  scriptId: string;
  terminalRegion: string;
  candidateBasis: readonly (
    | "terminal-name"
    | "membership-release"
    | "generation-invalidation"
  )[];
  reachableRegions: readonly string[];
  scopes: readonly ArenaLifecycleScopeAssessment[];
  unguardedDeferredCallbacks: number;
  status: ArenaLifecycleConvergenceStatus;
}

export interface ArenaLifecycleAnalysis {
  terminalCandidates: number;
  proven: number;
  partial: number;
  unresolved: number;
  assessments: readonly ArenaLifecycleTerminalAssessment[];
}

const TERMINAL_NAMES = new Set([
  "endgame",
  "endmatch",
  "finishgame",
  "finishmatch",
  "cleanup",
  "cleanuparena",
  "reset",
  "resetarena",
  "abort",
  "abortgame",
  "timeout",
  "victory",
  "defeat",
  "stopgame",
  "leavearena",
  "disconnect",
  "playerleave",
  "onplayerleave",
]);

function terminalNameCandidate(region: string): boolean {
  const name = region.startsWith("function:")
    ? region.slice("function:".length)
    : region;
  return TERMINAL_NAMES.has(
    name.replace(/[^A-Za-z0-9]/g, "").toLowerCase(),
  );
}

function graphFor(script: ParsedScriptFile): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const call of script.localFunctionCalls) {
    const targets = graph.get(call.callerRegion) ?? new Set<string>();
    targets.add(call.targetRegion);
    graph.set(call.callerRegion, targets);
  }
  return graph;
}

function reachable(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  root: string,
): string[] {
  const seen = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const next of graph.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return [...seen].sort();
}

function authorityPathsByRegion(
  script: ParsedScriptFile,
): Map<string, ScriptArenaAuthorityPath[]> {
  const output = new Map<string, ScriptArenaAuthorityPath[]>();
  for (const path of script.arenaAuthorityPaths ?? []) {
    const list = output.get(path.executionRegion) ?? [];
    list.push(path);
    output.set(path.executionRegion, list);
  }
  return output;
}

function terminalRegions(
  script: ParsedScriptFile,
): Map<string, Set<ArenaLifecycleTerminalAssessment["candidateBasis"][number]>> {
  const output = new Map<
    string,
    Set<ArenaLifecycleTerminalAssessment["candidateBasis"][number]>
  >();

  const add = (
    region: string,
    basis: ArenaLifecycleTerminalAssessment["candidateBasis"][number],
  ) => {
    const set = output.get(region) ?? new Set();
    set.add(basis);
    output.set(region, set);
  };

  for (const call of script.localFunctionCalls) {
    if (terminalNameCandidate(call.callerRegion)) {
      add(call.callerRegion, "terminal-name");
    }
    if (terminalNameCandidate(call.targetRegion)) {
      add(call.targetRegion, "terminal-name");
    }
  }

  for (const path of script.arenaAuthorityPaths ?? []) {
    if (terminalNameCandidate(path.executionRegion)) {
      add(path.executionRegion, "terminal-name");
    }
    if (path.membershipRelease) {
      add(path.executionRegion, "membership-release");
    }
    if (path.generationInvalidation) {
      add(path.executionRegion, "generation-invalidation");
    }
  }

  for (const callback of script.deferredCallbacks) {
    if (
      callback.callerRegion &&
      terminalNameCandidate(callback.callerRegion)
    ) {
      add(callback.callerRegion, "terminal-name");
    }
  }

  return output;
}

function assessScript(
  script: ParsedScriptFile,
): ArenaLifecycleTerminalAssessment[] {
  const graph = graphFor(script);
  const paths = authorityPathsByRegion(script);
  const candidates = terminalRegions(script);
  const output: ArenaLifecycleTerminalAssessment[] = [];

  for (const [terminalRegion, basis] of candidates) {
    const regions = reachable(graph, terminalRegion);
    const byArena = new Map<
      string,
      { release: boolean; invalidate: boolean }
    >();

    for (const region of regions) {
      for (const path of paths.get(region) ?? []) {
        const state = byArena.get(path.arenaExpression) ?? {
          release: false,
          invalidate: false,
        };
        state.release ||= path.membershipRelease !== undefined;
        state.invalidate ||=
          path.generationInvalidation !== undefined;
        byArena.set(path.arenaExpression, state);
      }
    }

    const scopes: ArenaLifecycleScopeAssessment[] = [
      ...byArena.entries(),
    ]
      .map(([arenaExpression, state]) => ({
        arenaExpression,
        membershipRelease: state.release,
        generationInvalidation: state.invalidate,
        status:
          state.release && state.invalidate
            ? "proven" as const
            : state.release || state.invalidate
              ? "partial" as const
              : "unresolved" as const,
      }))
      .sort((a, b) =>
        a.arenaExpression.localeCompare(b.arenaExpression)
      );

    const unguardedDeferredCallbacks =
      script.deferredCallbacks.filter((callback) =>
        callback.callerRegion !== undefined &&
        regions.includes(callback.callerRegion) &&
        callback.guardEvidence === "unresolved"
      ).length;

    const status: ArenaLifecycleConvergenceStatus =
      scopes.length === 0
        ? "unresolved"
        : scopes.every((item) => item.status === "proven")
          ? "proven"
          : "partial";

    output.push({
      scriptId: script.identifier,
      terminalRegion,
      candidateBasis: [...basis].sort(),
      reachableRegions: regions,
      scopes,
      unguardedDeferredCallbacks,
      status,
    });
  }

  return output.sort((a, b) =>
    a.scriptId.localeCompare(b.scriptId) ||
    a.terminalRegion.localeCompare(b.terminalRegion)
  );
}

export function analyzeArenaLifecycleConvergence(
  scripts: readonly ParsedScriptFile[],
): ArenaLifecycleAnalysis {
  const assessments = scripts.flatMap(assessScript);
  return {
    terminalCandidates: assessments.length,
    proven: assessments.filter(
      (item) => item.status === "proven",
    ).length,
    partial: assessments.filter(
      (item) => item.status === "partial",
    ).length,
    unresolved: assessments.filter(
      (item) => item.status === "unresolved",
    ).length,
    assessments,
  };
}
