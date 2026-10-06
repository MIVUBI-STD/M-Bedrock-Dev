import type {
  CrossFileCallEdge,
  ParsedScriptFile,
  ScriptArenaAuthorityPath,
} from "../../../../analyzers/scripts/src/index.js";
import {
  composeQualifiedScriptLifecycleProjectGraph,
} from "../../../../analyzers/scripts/src/index.js";

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

export interface ArenaTerminalIngressAssessment {
  scriptId: string;
  terminalRegion: string;
  incomingCallerRegions: readonly string[];
  incomingControlFlows: readonly (
    | "unconditional"
    | "conditional"
    | "deferred"
    | "unknown"
  )[];
  distinctIngresses: number;
  status: "single-ingress" | "multi-ingress";
}

export interface ArenaLifecycleAnalysis {
  terminalCandidates: number;
  proven: number;
  partial: number;
  unresolved: number;
  multiIngressTerminalTargets: number;
  terminalIngresses:
    readonly ArenaTerminalIngressAssessment[];
  assessments: readonly ArenaLifecycleTerminalAssessment[];
  crossFileCalls?: number;
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

type CandidateBasis =
  ArenaLifecycleTerminalAssessment["candidateBasis"][number];

function regionFunctionName(
  region: string,
): string {
  const marker = "#function:";
  const qualified = region.lastIndexOf(marker);
  if (qualified >= 0) {
    return region.slice(
      qualified + marker.length,
    );
  }
  return region.startsWith("function:")
    ? region.slice("function:".length)
    : region;
}

function terminalNameCandidate(
  region: string,
): boolean {
  return TERMINAL_NAMES.has(
    regionFunctionName(region)
      .replace(/[^A-Za-z0-9]/g, "")
      .toLowerCase(),
  );
}

function qualifiedRegion(
  script: ParsedScriptFile,
  region: string,
): string {
  return (
    "module:" +
    script.source.relativePath +
    "#" +
    region
  );
}

function graphFor(
  script: ParsedScriptFile,
): Map<string, Set<string>> {
  const graph = new Map<
    string,
    Set<string>
  >();
  for (const call of script.localFunctionCalls) {
    const targets =
      graph.get(call.callerRegion) ??
      new Set<string>();
    targets.add(call.targetRegion);
    graph.set(
      call.callerRegion,
      targets,
    );
  }
  return graph;
}

function reachable(
  graph:
    ReadonlyMap<
      string,
      ReadonlySet<string>
    >,
  root: string,
): string[] {
  const seen = new Set<string>([root]);
  const queue = [root];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (
      const next of
        graph.get(current) ?? []
    ) {
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
  const output =
    new Map<
      string,
      ScriptArenaAuthorityPath[]
    >();
  for (
    const path of
      script.arenaAuthorityPaths ?? []
  ) {
    const list =
      output.get(path.executionRegion) ??
      [];
    list.push(path);
    output.set(
      path.executionRegion,
      list,
    );
  }
  return output;
}

function terminalRegions(
  script: ParsedScriptFile,
): Map<string, Set<CandidateBasis>> {
  const output =
    new Map<
      string,
      Set<CandidateBasis>
    >();

  const add = (
    region: string,
    basis: CandidateBasis,
  ) => {
    const set =
      output.get(region) ??
      new Set<CandidateBasis>();
    set.add(basis);
    output.set(region, set);
  };

  for (
    const call of
      script.localFunctionCalls
  ) {
    if (
      terminalNameCandidate(
        call.callerRegion,
      )
    ) {
      add(
        call.callerRegion,
        "terminal-name",
      );
    }
    if (
      terminalNameCandidate(
        call.targetRegion,
      )
    ) {
      add(
        call.targetRegion,
        "terminal-name",
      );
    }
  }

  for (
    const path of
      script.arenaAuthorityPaths ?? []
  ) {
    if (
      terminalNameCandidate(
        path.executionRegion,
      )
    ) {
      add(
        path.executionRegion,
        "terminal-name",
      );
    }
    if (path.membershipRelease) {
      add(
        path.executionRegion,
        "membership-release",
      );
    }
    if (path.generationInvalidation) {
      add(
        path.executionRegion,
        "generation-invalidation",
      );
    }
  }

  for (
    const callback of
      script.deferredCallbacks
  ) {
    if (
      callback.callerRegion &&
      terminalNameCandidate(
        callback.callerRegion,
      )
    ) {
      add(
        callback.callerRegion,
        "terminal-name",
      );
    }
  }

  return output;
}

function assessScript(
  script: ParsedScriptFile,
): ArenaLifecycleTerminalAssessment[] {
  const graph = graphFor(script);
  const paths =
    authorityPathsByRegion(script);
  const candidates =
    terminalRegions(script);
  const output:
    ArenaLifecycleTerminalAssessment[] =
      [];

  for (
    const [terminalRegion, basis] of
      candidates
  ) {
    const regions =
      reachable(
        graph,
        terminalRegion,
      );
    const byArena =
      new Map<
        string,
        {
          release: boolean;
          invalidate: boolean;
        }
      >();

    for (const region of regions) {
      for (
        const path of
          paths.get(region) ?? []
      ) {
        const state =
          byArena.get(
            path.arenaExpression,
          ) ?? {
            release: false,
            invalidate: false,
          };
        state.release ||=
          path.membershipRelease !==
          undefined;
        state.invalidate ||=
          path.generationInvalidation !==
          undefined;
        byArena.set(
          path.arenaExpression,
          state,
        );
      }
    }

    const scopes:
      ArenaLifecycleScopeAssessment[] =
      [...byArena.entries()]
        .map(
          ([
            arenaExpression,
            state,
          ]) => ({
            arenaExpression,
            membershipRelease:
              state.release,
            generationInvalidation:
              state.invalidate,
            status:
              state.release &&
              state.invalidate
                ? "proven" as const
                : state.release ||
                    state.invalidate
                  ? "partial" as const
                  : "unresolved" as const,
          }),
        )
        .sort((a, b) =>
          a.arenaExpression
            .localeCompare(
              b.arenaExpression,
            ),
        );

    const unguardedDeferredCallbacks =
      script.deferredCallbacks.filter(
        (callback) =>
          callback.callerRegion !==
            undefined &&
          regions.includes(
            callback.callerRegion,
          ) &&
          callback.guardEvidence ===
            "unresolved",
      ).length;

    const status:
      ArenaLifecycleConvergenceStatus =
      scopes.length === 0
        ? "unresolved"
        : scopes.every(
              (item) =>
                item.status ===
                "proven",
            )
          ? "proven"
          : "partial";

    output.push({
      scriptId:
        script.identifier,
      terminalRegion,
      candidateBasis:
        [...basis].sort(),
      reachableRegions: regions,
      scopes,
      unguardedDeferredCallbacks,
      status,
    });
  }

  return output.sort((a, b) =>
    a.scriptId.localeCompare(
      b.scriptId,
    ) ||
    a.terminalRegion.localeCompare(
      b.terminalRegion,
    ),
  );
}

function projectReachable(
  edges:
    readonly {
      callerRegion: string;
      targetRegion: string;
      controlFlow:
        | "unconditional"
        | "conditional"
        | "deferred"
        | "unknown";
    }[],
  root: string,
  unconditionalOnly: boolean,
): string[] {
  const byFrom =
    new Map<
      string,
      string[]
    >();

  for (const edge of edges) {
    if (
      unconditionalOnly &&
      edge.controlFlow !==
        "unconditional"
    ) {
      continue;
    }
    const list =
      byFrom.get(
        edge.callerRegion,
      ) ?? [];
    list.push(
      edge.targetRegion,
    );
    byFrom.set(
      edge.callerRegion,
      list,
    );
  }

  return reachable(
    new Map(
      [...byFrom.entries()].map(
        ([key, value]) => [
          key,
          new Set(value),
        ],
      ),
    ),
    root,
  );
}

function assessProject(
  scripts: readonly ParsedScriptFile[],
  crossFileCalls:
    readonly CrossFileCallEdge[],
): ArenaLifecycleTerminalAssessment[] {
  const projectGraph =
    composeQualifiedScriptLifecycleProjectGraph(
      scripts.map((script) => ({
        fileId:
          script.source.relativePath,
        localFunctionCalls:
          script.localFunctionCalls,
      })),
      crossFileCalls,
    );

  const paths =
    new Map<
      string,
      ScriptArenaAuthorityPath[]
    >();
  const candidates =
    new Map<
      string,
      {
        scriptId: string;
        basis: Set<CandidateBasis>;
      }
    >();

  const addCandidate = (
    script: ParsedScriptFile,
    region: string,
    basis: CandidateBasis,
  ) => {
    const key =
      qualifiedRegion(
        script,
        region,
      );
    const current =
      candidates.get(key) ?? {
        scriptId:
          script.identifier,
        basis:
          new Set<CandidateBasis>(),
      };
    current.basis.add(basis);
    candidates.set(
      key,
      current,
    );
  };

  const scriptsByPath =
    new Map(
      scripts.map((script) => [
        script.source.relativePath,
        script,
      ]),
    );

  for (const call of crossFileCalls) {
    const callerScript =
      scriptsByPath.get(
        call.callerModule,
      );
    if (
      callerScript &&
      terminalNameCandidate(
        call.callerRegion,
      )
    ) {
      addCandidate(
        callerScript,
        call.callerRegion,
        "terminal-name",
      );
    }

    if (
      call.status === "resolved" &&
      call.targetModule !== undefined
    ) {
      const targetScript =
        scriptsByPath.get(
          call.targetModule,
        );
      if (
        targetScript &&
        terminalNameCandidate(
          "function:" +
            call.targetExport,
        )
      ) {
        addCandidate(
          targetScript,
          "function:" +
            call.targetExport,
          "terminal-name",
        );
      }
    }
  }

  for (const script of scripts) {
    for (
      const path of
        script.arenaAuthorityPaths ??
        []
    ) {
      const key =
        qualifiedRegion(
          script,
          path.executionRegion,
        );
      const list =
        paths.get(key) ?? [];
      list.push(path);
      paths.set(key, list);

      if (
        terminalNameCandidate(
          path.executionRegion,
        )
      ) {
        addCandidate(
          script,
          path.executionRegion,
          "terminal-name",
        );
      }
      if (path.membershipRelease) {
        addCandidate(
          script,
          path.executionRegion,
          "membership-release",
        );
      }
      if (
        path.generationInvalidation
      ) {
        addCandidate(
          script,
          path.executionRegion,
          "generation-invalidation",
        );
      }
    }

    for (
      const call of
        script.localFunctionCalls
    ) {
      if (
        terminalNameCandidate(
          call.callerRegion,
        )
      ) {
        addCandidate(
          script,
          call.callerRegion,
          "terminal-name",
        );
      }
      if (
        terminalNameCandidate(
          call.targetRegion,
        )
      ) {
        addCandidate(
          script,
          call.targetRegion,
          "terminal-name",
        );
      }
    }

    for (
      const callback of
        script.deferredCallbacks
    ) {
      if (
        callback.callerRegion &&
        terminalNameCandidate(
          callback.callerRegion,
        )
      ) {
        addCandidate(
          script,
          callback.callerRegion,
          "terminal-name",
        );
      }
    }
  }

  const output:
    ArenaLifecycleTerminalAssessment[] =
      [];

  for (
    const [
      terminalRegion,
      candidate,
    ] of candidates
  ) {
    const allRegions =
      projectReachable(
        projectGraph.callEdges,
        terminalRegion,
        false,
      );
    const strongRegions =
      new Set(
        projectReachable(
          projectGraph.callEdges,
          terminalRegion,
          true,
        ),
      );

    const byArena =
      new Map<
        string,
        {
          releaseAny: boolean;
          invalidateAny: boolean;
          releaseStrong: boolean;
          invalidateStrong:
            boolean;
        }
      >();

    for (const region of allRegions) {
      for (
        const path of
          paths.get(region) ?? []
      ) {
        const state =
          byArena.get(
            path.arenaExpression,
          ) ?? {
            releaseAny: false,
            invalidateAny: false,
            releaseStrong: false,
            invalidateStrong: false,
          };

        const release =
          path.membershipRelease !==
          undefined;
        const invalidate =
          path.generationInvalidation !==
          undefined;

        state.releaseAny ||= release;
        state.invalidateAny ||=
          invalidate;

        if (
          strongRegions.has(region)
        ) {
          state.releaseStrong ||=
            release;
          state.invalidateStrong ||=
            invalidate;
        }

        byArena.set(
          path.arenaExpression,
          state,
        );
      }
    }

    const scopes =
      [...byArena.entries()]
        .map(
          ([
            arenaExpression,
            state,
          ]) => ({
            arenaExpression,
            membershipRelease:
              state.releaseAny,
            generationInvalidation:
              state.invalidateAny,
            status:
              state.releaseStrong &&
              state.invalidateStrong
                ? "proven" as const
                : state.releaseAny ||
                    state.invalidateAny
                  ? "partial" as const
                  : "unresolved" as const,
          }),
        )
        .sort((a, b) =>
          a.arenaExpression
            .localeCompare(
              b.arenaExpression,
            ),
        );

    const unguardedDeferredCallbacks =
      scripts.reduce(
        (count, script) =>
          count +
          script.deferredCallbacks
            .filter(
              (callback) =>
                callback.callerRegion !==
                  undefined &&
                allRegions.includes(
                  qualifiedRegion(
                    script,
                    callback.callerRegion,
                  ),
                ) &&
                callback
                  .guardEvidence ===
                  "unresolved",
            )
            .length,
        0,
      );

    const status:
      ArenaLifecycleConvergenceStatus =
      scopes.length === 0
        ? "unresolved"
        : scopes.every(
              (item) =>
                item.status ===
                "proven",
            )
          ? "proven"
          : "partial";

    output.push({
      scriptId:
        candidate.scriptId,
      terminalRegion,
      candidateBasis:
        [...candidate.basis].sort(),
      reachableRegions:
        allRegions,
      scopes,
      unguardedDeferredCallbacks,
      status,
    });
  }

  return output.sort((a, b) =>
    a.scriptId.localeCompare(
      b.scriptId,
    ) ||
    a.terminalRegion.localeCompare(
      b.terminalRegion,
    ),
  );
}

function terminalIngressesForLocal(
  scripts: readonly ParsedScriptFile[],
  assessments:
    readonly ArenaLifecycleTerminalAssessment[],
): ArenaTerminalIngressAssessment[] {
  return assessments.map((assessment) => {
    const script = scripts.find(
      (item) =>
        item.identifier === assessment.scriptId,
    );
    const incoming =
      script?.localFunctionCalls.filter(
        (call) =>
          call.targetRegion ===
            assessment.terminalRegion,
      ) ?? [];
    const callers = [
      ...new Set(
        incoming.map(
          (call) => call.callerRegion,
        ),
      ),
    ].sort();
    const flows = [
      ...new Set(
        incoming.map(
          (call) =>
            call.controlFlow ??
            "unknown" as const,
        ),
      ),
    ].sort();
    return {
      scriptId: assessment.scriptId,
      terminalRegion:
        assessment.terminalRegion,
      incomingCallerRegions: callers,
      incomingControlFlows: flows,
      distinctIngresses: callers.length,
      status:
        callers.length > 1
          ? "multi-ingress" as const
          : "single-ingress" as const,
    };
  });
}

function terminalIngressesForProject(
  scripts: readonly ParsedScriptFile[],
  crossFileCalls:
    readonly CrossFileCallEdge[],
  assessments:
    readonly ArenaLifecycleTerminalAssessment[],
): ArenaTerminalIngressAssessment[] {
  const projectGraph =
    composeQualifiedScriptLifecycleProjectGraph(
      scripts.map((script) => ({
        fileId:
          script.source.relativePath,
        localFunctionCalls:
          script.localFunctionCalls,
      })),
      crossFileCalls,
    );

  return assessments.map((assessment) => {
    const incoming =
      projectGraph.callEdges.filter(
        (edge) =>
          edge.targetRegion ===
            assessment.terminalRegion,
      );
    const callers = [
      ...new Set(
        incoming.map(
          (edge) => edge.callerRegion,
        ),
      ),
    ].sort();
    const flows = [
      ...new Set(
        incoming.map(
          (edge) => edge.controlFlow,
        ),
      ),
    ].sort();
    return {
      scriptId: assessment.scriptId,
      terminalRegion:
        assessment.terminalRegion,
      incomingCallerRegions: callers,
      incomingControlFlows: flows,
      distinctIngresses: callers.length,
      status:
        callers.length > 1
          ? "multi-ingress" as const
          : "single-ingress" as const,
    };
  });
}

export function analyzeArenaLifecycleConvergence(
  scripts: readonly ParsedScriptFile[],
  crossFileCalls:
    readonly CrossFileCallEdge[] = [],
): ArenaLifecycleAnalysis {
  const assessments =
    crossFileCalls.length === 0
      ? scripts.flatMap(assessScript)
      : assessProject(
          scripts,
          crossFileCalls,
        );

  const terminalIngresses =
    crossFileCalls.length === 0
      ? terminalIngressesForLocal(
          scripts,
          assessments,
        )
      : terminalIngressesForProject(
          scripts,
          crossFileCalls,
          assessments,
        );

  return {
    terminalCandidates:
      assessments.length,
    proven:
      assessments.filter(
        (item) =>
          item.status === "proven",
      ).length,
    partial:
      assessments.filter(
        (item) =>
          item.status === "partial",
      ).length,
    unresolved:
      assessments.filter(
        (item) =>
          item.status ===
          "unresolved",
      ).length,
    multiIngressTerminalTargets:
      terminalIngresses.filter(
        (item) =>
          item.status ===
          "multi-ingress",
      ).length,
    terminalIngresses,
    assessments,
    ...(crossFileCalls.length === 0
      ? {}
      : {
          crossFileCalls:
            crossFileCalls.length,
        }),
  };
}
