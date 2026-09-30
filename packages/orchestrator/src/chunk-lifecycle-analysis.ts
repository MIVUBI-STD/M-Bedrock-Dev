import type {
  ParsedScriptFile,
  ScriptChunkLifecycleEvidence,
} from "../../../analyzers/scripts/src/index.js";

export interface ChunkLeaseAssessment {
  scriptId: string;
  leaseKey?: string;
  acquireRegions: readonly string[];
  releaseRegions: readonly string[];
  capacityCheckRegions: readonly string[];
  status:
    | "paired"
    | "acquire-without-release"
    | "release-without-acquire"
    | "dynamic-key"
    | "capacity-unchecked";
}

export interface ChunkLifecycleAnalysis {
  worldLoadObservers: number;
  entityLoadObservers: number;
  entityRemoveObservers: number;
  shutdownObservers: number;
  readinessProbes: number;
  tickingAreaReadinessStates: number;
  tickingAreaAcquires: number;
  tickingAreaReleases: number;
  capacityChecks: number;
  pairedLeases: number;
  acquireWithoutRelease: number;
  releaseWithoutAcquire: number;
  dynamicLeaseKeys: number;
  capacityUncheckedLeases: number;
  shutdownOnlyCleanupRisk: number;
  worldLoadReconciliationPaths: number;
  unguardedDeferredChunkWork: number;
  entityResidencyObservability: "complete" | "partial" | "absent";
  leases: readonly ChunkLeaseAssessment[];
}

function evidenceFor(
  script: ParsedScriptFile,
): readonly ScriptChunkLifecycleEvidence[] {
  return script.chunkLifecycleEvidence ?? [];
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

function callGraphFor(
  script: ParsedScriptFile,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const call of script.localFunctionCalls) {
    const next =
      graph.get(call.callerRegion) ??
      new Set<string>();
    next.add(call.targetRegion);
    graph.set(call.callerRegion, next);
  }
  return graph;
}

function reachableRegions(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  root: string,
): Set<string> {
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

  return seen;
}

function regionCanReach(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  from: string,
  to: string,
): boolean {
  return reachableRegions(graph, from).has(to);
}

function analyzeScriptLeases(
  script: ParsedScriptFile,
): ChunkLeaseAssessment[] {
  const evidence = evidenceFor(script);
  const acquires = evidence.filter(
    (item) => item.kind === "ticking-area-acquire",
  );
  const releases = evidence.filter(
    (item) => item.kind === "ticking-area-release",
  );
  const capacity = evidence.filter(
    (item) =>
      item.kind === "ticking-area-capacity-check",
  );
  const graph = callGraphFor(script);

  const keys = new Set<string | undefined>([
    ...acquires.map((item) => item.leaseKey),
    ...releases.map((item) => item.leaseKey),
  ]);

  return [...keys]
    .map((leaseKey): ChunkLeaseAssessment => {
      const keyAcquires = acquires.filter(
        (item) => item.leaseKey === leaseKey,
      );
      const keyReleases = releases.filter(
        (item) => item.leaseKey === leaseKey,
      );
      const relevantCapacity = capacity.filter(
        (check) =>
          keyAcquires.some(
            (acquire) =>
              check.executionRegion ===
                acquire.executionRegion ||
              regionCanReach(
                graph,
                check.executionRegion,
                acquire.executionRegion,
              ),
          ),
      );
      const hasCapacity =
        relevantCapacity.length > 0;

      let status: ChunkLeaseAssessment["status"];
      if (leaseKey === undefined) {
        status = "dynamic-key";
      } else if (
        keyAcquires.length > 0 &&
        keyReleases.length === 0
      ) {
        status = "acquire-without-release";
      } else if (
        keyAcquires.length === 0 &&
        keyReleases.length > 0
      ) {
        status = "release-without-acquire";
      } else if (
        keyAcquires.length > 0 &&
        keyReleases.length > 0 &&
        !hasCapacity
      ) {
        status = "capacity-unchecked";
      } else {
        status = "paired";
      }

      return {
        scriptId: script.identifier,
        ...(leaseKey === undefined
          ? {}
          : { leaseKey }),
        acquireRegions: uniqueSorted(
          keyAcquires.map(
            (item) => item.executionRegion,
          ),
        ),
        releaseRegions: uniqueSorted(
          keyReleases.map(
            (item) => item.executionRegion,
          ),
        ),
        capacityCheckRegions: uniqueSorted(
          relevantCapacity.map(
            (item) => item.executionRegion,
          ),
        ),
        status,
      };
    })
    .sort((a, b) =>
      (a.leaseKey ?? "").localeCompare(
        b.leaseKey ?? "",
      ),
    );
}

function chunkLifecycleRegions(
  script: ParsedScriptFile,
): Set<string> {
  return new Set(
    evidenceFor(script)
      .filter(
        (item) =>
          item.kind === "chunk-readiness-probe" ||
          item.kind === "ticking-area-acquire" ||
          item.kind === "ticking-area-release" ||
          item.kind === "ticking-area-capacity-check",
      )
      .map((item) => item.executionRegion),
  );
}

function unguardedDeferredChunkWorkFor(
  script: ParsedScriptFile,
): number {
  const graph = callGraphFor(script);
  const chunkRegions =
    chunkLifecycleRegions(script);

  return script.deferredCallbacks.filter(
    (callback) => {
      if (
        callback.guardEvidence ===
        "explicit-generation-check"
      ) {
        return false;
      }
      const root =
        callback.callbackRegion;
      if (root === undefined) return false;

      const reachable =
        reachableRegions(graph, root);
      return [...chunkRegions].some(
        (region) => reachable.has(region),
      );
    },
  ).length;
}

function worldLoadReconciliationPathsFor(
  script: ParsedScriptFile,
): number {
  const evidence = evidenceFor(script);
  const graph = callGraphFor(script);
  const releaseRegions = new Set(
    evidence
      .filter(
        (item) =>
          item.kind ===
          "ticking-area-release",
      )
      .map((item) => item.executionRegion),
  );

  return evidence
    .filter(
      (item) =>
        item.kind ===
        "world-load-subscription",
    )
    .filter((observer) => {
      const reachable =
        reachableRegions(
          graph,
          observer.executionRegion,
        );
      return [...releaseRegions].some(
        (region) => reachable.has(region),
      );
    }).length;
}

export function analyzeChunkLifecycle(
  scripts: readonly ParsedScriptFile[],
): ChunkLifecycleAnalysis {
  const all = scripts.flatMap(
    (script) => evidenceFor(script),
  );
  const leases = scripts
    .flatMap(analyzeScriptLeases)
    .sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      (a.leaseKey ?? "").localeCompare(
        b.leaseKey ?? "",
      ),
    );

  const worldLoadObservers = all.filter(
    (item) =>
      item.kind ===
      "world-load-subscription",
  ).length;
  const entityLoadObservers = all.filter(
    (item) =>
      item.kind ===
      "entity-load-subscription",
  ).length;
  const entityRemoveObservers = all.filter(
    (item) =>
      item.kind ===
      "entity-remove-subscription",
  ).length;
  const shutdownObservers = all.filter(
    (item) =>
      item.kind ===
      "shutdown-subscription",
  ).length;
  const readinessProbes = all.filter(
    (item) =>
      item.kind ===
      "chunk-readiness-probe",
  ).length;
  const tickingAreaReadinessStates = all.filter(
    (item) =>
      item.kind ===
      "ticking-area-readiness-state",
  ).length;
  const tickingAreaAcquires = all.filter(
    (item) =>
      item.kind ===
      "ticking-area-acquire",
  ).length;
  const tickingAreaReleases = all.filter(
    (item) =>
      item.kind ===
      "ticking-area-release",
  ).length;
  const capacityChecks = all.filter(
    (item) =>
      item.kind ===
      "ticking-area-capacity-check",
  ).length;

  const releasesByScript = scripts.flatMap(
    (script) => {
      const evidence = evidenceFor(script);
      const graph = callGraphFor(script);
      const shutdownRoots = evidence
        .filter(
          (item) =>
            item.kind ===
            "shutdown-subscription",
        )
        .map((item) => item.executionRegion);
      const shutdownReachable =
        new Set(
          shutdownRoots.flatMap(
            (root) =>
              [
                ...reachableRegions(
                  graph,
                  root,
                ),
              ],
          ),
        );

      return evidence
        .filter(
          (item) =>
            item.kind ===
            "ticking-area-release",
        )
        .map((release) => ({
          release,
          shutdownReachable:
            shutdownReachable.has(
              release.executionRegion,
            ),
        }));
    },
  );
  const anyShutdownRelease =
    releasesByScript.some(
      (item) => item.shutdownReachable,
    );
  const anyNonShutdownRelease =
    releasesByScript.some(
      (item) => !item.shutdownReachable,
    );

  const entityResidencyObservability =
    entityLoadObservers > 0 &&
    entityRemoveObservers > 0
      ? "complete"
      : entityLoadObservers > 0 ||
          entityRemoveObservers > 0
        ? "partial"
        : "absent";

  const worldLoadReconciliationPaths =
    scripts.reduce(
      (sum, script) =>
        sum +
        worldLoadReconciliationPathsFor(
          script,
        ),
      0,
    );
  const unguardedDeferredChunkWork =
    scripts.reduce(
      (sum, script) =>
        sum +
        unguardedDeferredChunkWorkFor(
          script,
        ),
      0,
    );

  return {
    worldLoadObservers,
    entityLoadObservers,
    entityRemoveObservers,
    shutdownObservers,
    readinessProbes,
    tickingAreaReadinessStates,
    tickingAreaAcquires,
    tickingAreaReleases,
    capacityChecks,
    pairedLeases: leases.filter(
      (item) => item.status === "paired",
    ).length,
    acquireWithoutRelease: leases.filter(
      (item) =>
        item.status ===
        "acquire-without-release",
    ).length,
    releaseWithoutAcquire: leases.filter(
      (item) =>
        item.status ===
        "release-without-acquire",
    ).length,
    dynamicLeaseKeys: leases.filter(
      (item) =>
        item.status === "dynamic-key",
    ).length,
    capacityUncheckedLeases: leases.filter(
      (item) =>
        item.status ===
        "capacity-unchecked",
    ).length,
    shutdownOnlyCleanupRisk:
      tickingAreaAcquires > 0 &&
      tickingAreaReleases > 0 &&
      shutdownObservers > 0 &&
      anyShutdownRelease &&
      !anyNonShutdownRelease
        ? tickingAreaAcquires
        : 0,
    worldLoadReconciliationPaths,
    unguardedDeferredChunkWork,
    entityResidencyObservability,
    leases,
  };
}
