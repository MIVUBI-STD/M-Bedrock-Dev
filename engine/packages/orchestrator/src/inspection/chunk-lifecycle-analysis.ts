import type {
  ParsedScriptFile,
  ScriptChunkLifecycleEvidence,
} from "../../../../analyzers/scripts/src/index.js";

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
    | "release-unreachable"
    | "cleanup-order-unproven"
    | "dynamic-key"
    | "capacity-unchecked"
    | "readiness-unverified";
}

export interface ChunkLifecycleAnalysis {
  worldLoadObservers: number;
  entityLoadObservers: number;
  entityRemoveObservers: number;
  entityDieObservers: number;
  entitySpawnObservers: number;
  shutdownObservers: number;
  readinessProbes: number;
  tickingAreaReadinessStates: number;
  tickingAreaAcquires: number;
  tickingAreaReleases: number;
  capacityChecks: number;
  pairedLeases: number;
  acquireWithoutRelease: number;
  releaseWithoutAcquire: number;
  releaseUnreachable: number;
  cleanupOrderUnproven: number;
  dynamicLeaseKeys: number;
  capacityUncheckedLeases: number;
  readinessUnverifiedLeases: number;
  shutdownOnlyCleanupRisk: number;
  worldLoadReconciliationPaths: number;
  unguardedDeferredChunkWork: number;
  zeroTickDeferredChunkWork: number;
  spawnRecoveryRoutes: number;
  unloadedSpecificSpawnRecoveryRoutes: number;
  broadSpawnRecoveryRisks: number;
  otherSpecificSpawnRecoveryRoutes: number;
  entityRemoveTerminalizationRisks: number;
  entityResidencyObservability:
    | "complete"
    | "partial"
    | "absent";
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

function commonCallerCanReachBoth(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  knownRegions: readonly string[],
  acquireRegion: string,
  releaseRegion: string,
): boolean {
  return knownRegions.some((region) => {
    const reachable =
      reachableRegions(graph, region);
    return (
      reachable.has(acquireRegion) &&
      reachable.has(releaseRegion)
    );
  });
}

function releaseReachableForAcquire(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  acquireRegion: string,
  releaseRegion: string,
): boolean {
  return (
    acquireRegion === releaseRegion ||
    regionCanReach(
      graph,
      acquireRegion,
      releaseRegion,
    )
  );
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
  const readiness = evidence.filter(
    (item) =>
      item.kind === "chunk-readiness-probe" ||
      item.kind ===
        "ticking-area-readiness-state",
  );
  const graph = callGraphFor(script);
  const knownRegions = uniqueSorted([
    ...script.localFunctionCalls.flatMap(
      (call) => [
        call.callerRegion,
        call.targetRegion,
      ],
    ),
    ...evidence.map(
      (item) => item.executionRegion,
    ),
  ]);

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
      const relevantReadiness =
        readiness.filter(
          (probe) =>
            keyAcquires.some(
              (acquire) =>
                probe.executionRegion ===
                  acquire.executionRegion ||
                regionCanReach(
                  graph,
                  acquire.executionRegion,
                  probe.executionRegion,
                ) ||
                commonCallerCanReachBoth(
                  graph,
                  knownRegions,
                  acquire.executionRegion,
                  probe.executionRegion,
                ),
            ),
        );
      const hasCapacity =
        relevantCapacity.length > 0;
      const hasReadiness =
        relevantReadiness.length > 0;
      const hasReachableRelease =
        keyAcquires.some((acquire) =>
          keyReleases.some((release) =>
            releaseReachableForAcquire(
              graph,
              acquire.executionRegion,
              release.executionRegion,
            ),
          ),
        );
      const hasSharedCleanupOwner =
        !hasReachableRelease &&
        keyAcquires.some((acquire) =>
          keyReleases.some((release) =>
            commonCallerCanReachBoth(
              graph,
              knownRegions,
              acquire.executionRegion,
              release.executionRegion,
            ),
          ),
        );

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
        !hasReachableRelease &&
        hasSharedCleanupOwner
      ) {
        status = "cleanup-order-unproven";
      } else if (
        keyAcquires.length > 0 &&
        keyReleases.length > 0 &&
        !hasReachableRelease
      ) {
        status = "release-unreachable";
      } else if (
        keyAcquires.length > 0 &&
        keyReleases.length > 0 &&
        !hasCapacity
      ) {
        status = "capacity-unchecked";
      } else if (
        keyAcquires.length > 0 &&
        keyReleases.length > 0 &&
        !hasReadiness
      ) {
        status = "readiness-unverified";
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


function zeroTickDeferredChunkWorkFor(
  script: ParsedScriptFile,
): number {
  const graph = callGraphFor(script);
  const chunkRegions =
    chunkLifecycleRegions(script);

  return script.deferredCallbacks.filter(
    (callback) => {
      if (
        callback.scheduler !==
          "runTimeout" ||
        callback.delayTicks !== 0
      ) {
        return false;
      }

      const root =
        callback.callbackRegion;
      if (root === undefined) {
        return false;
      }

      const reachable =
        reachableRegions(
          graph,
          root,
        );
      return [...chunkRegions].some(
        (region) =>
          reachable.has(region),
      );
    },
  ).length;
}



function entityRemoveTerminalizationRisksFor(
  script: ParsedScriptFile,
): number {
  const removeRegions =
    new Set(
      evidenceFor(script)
        .filter(
          (item) =>
            item.kind ===
            "entity-remove-subscription",
        )
        .map(
          (item) =>
            item.executionRegion,
        ),
    );

  if (removeRegions.size === 0) {
    return 0;
  }

  return (
    script.stateMutations ?? []
  ).filter((mutation) => {
    if (
      !removeRegions.has(
        mutation.executionRegion,
      )
    ) {
      return false;
    }

    if (
      mutation.value.kind !==
      "literal"
    ) {
      return false;
    }

    const value =
      mutation.value.literal
        .trim()
        .toLowerCase();
    const target =
      (
        mutation.target +
        " " +
        mutation.targetName
      ).toLowerCase();

    const terminalValue =
      /^(?:dead|lost|missing|gone|destroyed|removed|permanentlylost|deadconfirmed)$/i.test(
        value,
      ) ||
      (
        value === "true" &&
        /(?:dead|lost|missing|destroyed|removed)/i.test(
          target,
        )
      );

    return terminalValue;
  }).length;
}

function spawnRecoveryRoutingFor(
  script: ParsedScriptFile,
): {
  routes: number;
  unloadedSpecific: number;
  broadRisk: number;
  otherSpecific: number;
} {
  const graph = callGraphFor(script);
  const chunkRegions =
    chunkLifecycleRegions(script);
  let routes = 0;
  let unloadedSpecific = 0;
  let broadRisk = 0;
  let otherSpecific = 0;

  for (
    const evidence of
      evidenceFor(script)
  ) {
    if (
      evidence.kind !==
      "spawn-recovery-catch"
    ) {
      continue;
    }

    const targets =
      evidence.recoveryTargetRegions ??
      [];
    const reachesChunkRecovery =
      targets.some((target) => {
        if (
          chunkRegions.has(target)
        ) {
          return true;
        }
        const reachable =
          reachableRegions(
            graph,
            target,
          );
        return [...chunkRegions].some(
          (region) =>
            reachable.has(region),
        );
      });

    if (!reachesChunkRecovery) {
      continue;
    }

    routes += 1;
    if (
      evidence.spawnRecoveryGuard ===
      "unloaded-specific"
    ) {
      unloadedSpecific += 1;
    } else if (
      evidence.spawnRecoveryGuard ===
      "other-specific"
    ) {
      otherSpecific += 1;
    } else {
      broadRisk += 1;
    }
  }

  return {
    routes,
    unloadedSpecific,
    broadRisk,
    otherSpecific,
  };
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
  const entityDieObservers = all.filter(
    (item) =>
      item.kind ===
      "entity-die-subscription",
  ).length;
  const entitySpawnObservers = all.filter(
    (item) =>
      item.kind ===
      "entity-spawn-subscription",
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

  const spawnRecoveryRouting =
    scripts.reduce(
      (summary, script) => {
        const current =
          spawnRecoveryRoutingFor(
            script,
          );
        return {
          routes:
            summary.routes +
            current.routes,
          unloadedSpecific:
            summary.unloadedSpecific +
            current.unloadedSpecific,
          broadRisk:
            summary.broadRisk +
            current.broadRisk,
          otherSpecific:
            summary.otherSpecific +
            current.otherSpecific,
        };
      },
      {
        routes: 0,
        unloadedSpecific: 0,
        broadRisk: 0,
        otherSpecific: 0,
      },
    );

  const entityRemoveTerminalizationRisks =
    scripts.reduce(
      (sum, script) =>
        sum +
        entityRemoveTerminalizationRisksFor(
          script,
        ),
      0,
    );

  const entityResidencyObservability =
    entityLoadObservers > 0 &&
    entityRemoveObservers > 0 &&
    entityDieObservers > 0
      ? "complete"
      : entityLoadObservers > 0 ||
          entityRemoveObservers > 0 ||
          entityDieObservers > 0 ||
          entitySpawnObservers > 0
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
  const zeroTickDeferredChunkWork =
    scripts.reduce(
      (sum, script) =>
        sum +
        zeroTickDeferredChunkWorkFor(
          script,
        ),
      0,
    );

  return {
    worldLoadObservers,
    entityLoadObservers,
    entityRemoveObservers,
    entityDieObservers,
    entitySpawnObservers,
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
    releaseUnreachable: leases.filter(
      (item) =>
        item.status ===
        "release-unreachable",
    ).length,
    cleanupOrderUnproven: leases.filter(
      (item) =>
        item.status ===
        "cleanup-order-unproven",
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
    readinessUnverifiedLeases: leases.filter(
      (item) =>
        item.status ===
        "readiness-unverified",
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
    zeroTickDeferredChunkWork,
    spawnRecoveryRoutes:
      spawnRecoveryRouting.routes,
    unloadedSpecificSpawnRecoveryRoutes:
      spawnRecoveryRouting.unloadedSpecific,
    broadSpawnRecoveryRisks:
      spawnRecoveryRouting.broadRisk,
    otherSpecificSpawnRecoveryRoutes:
      spawnRecoveryRouting.otherSpecific,
    entityRemoveTerminalizationRisks,
    entityResidencyObservability,
    leases,
  };
}
