import type {
  ParsedScriptFile,
} from "../../../analyzers/scripts/src/index.js";

export type ArenaCleanupSurfaceKind =
  | "membership"
  | "dynamic-property"
  | "deferred-callback"
  | "entity"
  | "tag"
  | "effect"
  | "scoreboard"
  | "input-permission";

export type ArenaCleanupEvidencePrecision =
  | "exact"
  | "surface-level";

export interface ArenaCleanupSurfaceMutation {
  scriptId: string;
  region: string;
  surface: ArenaCleanupSurfaceKind;
  key: string;
  action: "acquire" | "release";
  precision: ArenaCleanupEvidencePrecision;
}

export interface ArenaCleanupSurfaceAssessment {
  surface: ArenaCleanupSurfaceKind;
  key: string;
  acquisitionRegions: readonly string[];
  releaseRegions: readonly string[];
  releaseReachableFromTerminal: boolean;
  precision: ArenaCleanupEvidencePrecision;
  status: "proven" | "partial" | "unresolved";
}

export interface ArenaCleanupTerminalAssessment {
  scriptId: string;
  terminalRegion: string;
  reachableRegions: readonly string[];
  surfaces: readonly ArenaCleanupSurfaceAssessment[];
  exactProven: number;
  partial: number;
  unresolved: number;
}

export interface ArenaCleanupSurfaceAnalysis {
  acquiredSurfaces: number;
  terminalAssessments: readonly ArenaCleanupTerminalAssessment[];
  exactProven: number;
  partial: number;
  unresolved: number;
}

const TERMINAL_PATTERN =
  /^(?:function:)?(?:endgame|endmatch|finishgame|finishmatch|cleanup|cleanuparena|reset|resetarena|abort|abortgame|timeout|victory|defeat|stopgame|leavearena|disconnect|playerleave|onplayerleave)$/i;

function normalizedRegion(region: string | undefined): string {
  return region ?? "module";
}

function graphFor(
  script: ParsedScriptFile,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const call of script.localFunctionCalls) {
    const next = graph.get(call.callerRegion) ?? new Set<string>();
    next.add(call.targetRegion);
    graph.set(call.callerRegion, next);
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

function terminalRegions(script: ParsedScriptFile): string[] {
  const regions = new Set<string>();
  for (const call of script.localFunctionCalls) {
    if (TERMINAL_PATTERN.test(call.callerRegion)) {
      regions.add(call.callerRegion);
    }
    if (TERMINAL_PATTERN.test(call.targetRegion)) {
      regions.add(call.targetRegion);
    }
  }
  for (const path of script.arenaAuthorityPaths ?? []) {
    if (
      TERMINAL_PATTERN.test(path.executionRegion) ||
      path.membershipRelease ||
      path.generationInvalidation
    ) {
      regions.add(path.executionRegion);
    }
  }
  return [...regions].sort();
}

function mutationKey(
  surface: ArenaCleanupSurfaceKind,
  key: string,
): string {
  return surface + "|" + key;
}

function extractMutations(
  script: ParsedScriptFile,
): ArenaCleanupSurfaceMutation[] {
  const output: ArenaCleanupSurfaceMutation[] = [];

  for (const path of script.arenaAuthorityPaths ?? []) {
    if (path.membershipCommit?.membershipExpression) {
      output.push({
        scriptId: script.identifier,
        region: path.executionRegion,
        surface: "membership",
        key: path.membershipCommit.membershipExpression,
        action: "acquire",
        precision: "exact",
      });
    }
    if (path.membershipRelease?.membershipExpression) {
      output.push({
        scriptId: script.identifier,
        region: path.executionRegion,
        surface: "membership",
        key: path.membershipRelease.membershipExpression,
        action: "release",
        precision: "exact",
      });
    }
  }

  for (const access of script.dynamicProperties) {
    const region = normalizedRegion(access.executionRegion);
    if (access.operation === "set") {
      output.push({
        scriptId: script.identifier,
        region,
        surface: "dynamic-property",
        key: (access.receiverHint ?? "unknown") + ":" +
          (access.propertyId ?? "*"),
        action: "acquire",
        precision:
          access.propertyId === undefined
            ? "surface-level"
            : "exact",
      });
    } else if (access.operation === "delete") {
      output.push({
        scriptId: script.identifier,
        region,
        surface: "dynamic-property",
        key: (access.receiverHint ?? "unknown") + ":" +
          (access.propertyId ?? "*"),
        action: "release",
        precision:
          access.propertyId === undefined
            ? "surface-level"
            : "exact",
      });
    } else if (access.operation === "clear") {
      output.push({
        scriptId: script.identifier,
        region,
        surface: "dynamic-property",
        key: (access.receiverHint ?? "unknown") + ":*",
        action: "release",
        precision: "surface-level",
      });
    }
  }

  for (const callback of script.deferredCallbacks) {
    output.push({
      scriptId: script.identifier,
      region: normalizedRegion(callback.callerRegion),
      surface: "deferred-callback",
      key: callback.scheduler,
      action: "acquire",
      precision: "surface-level",
    });
  }

  for (const call of script.methodCalls) {
    const region = normalizedRegion(call.executionRegion);
    const method = call.method;

    const pair:
      | {
          surface: ArenaCleanupSurfaceKind;
          action: "acquire" | "release";
          key: string;
        }
      | undefined =
      method === "addTag"
        ? { surface: "tag", action: "acquire", key: call.receiverHint ?? call.receiverType }
        : method === "removeTag"
          ? { surface: "tag", action: "release", key: call.receiverHint ?? call.receiverType }
          : method === "addEffect"
            ? { surface: "effect", action: "acquire", key: call.receiverHint ?? call.receiverType }
            : method === "removeEffect" || method === "clearEffects"
              ? { surface: "effect", action: "release", key: call.receiverHint ?? call.receiverType }
              : method === "spawnEntity"
                ? { surface: "entity", action: "acquire", key: call.receiverHint ?? call.receiverType }
                : method === "remove" || method === "kill"
                  ? { surface: "entity", action: "release", key: call.receiverHint ?? call.receiverType }
                  : method === "setScore" || method === "addScore"
                    ? { surface: "scoreboard", action: "acquire", key: call.receiverHint ?? call.receiverType }
                    : method === "removeParticipant"
                      ? { surface: "scoreboard", action: "release", key: call.receiverHint ?? call.receiverType }
                      : method === "clearRun"
                        ? { surface: "deferred-callback", action: "release", key: "system" }
                        : undefined;

    if (pair) {
      output.push({
        scriptId: script.identifier,
        region,
        surface: pair.surface,
        key: pair.key,
        action: pair.action,
        precision: "surface-level",
      });
    }
  }

  for (const write of script.propertyWrites) {
    if (
      write.receiverType === "PlayerInputPermissions"
    ) {
      output.push({
        scriptId: script.identifier,
        region: "module",
        surface: "input-permission",
        key: write.symbol,
        action: "acquire",
        precision: "surface-level",
      });
    }
  }

  return output;
}

function releaseMatches(
  acquire: ArenaCleanupSurfaceMutation,
  release: ArenaCleanupSurfaceMutation,
): boolean {
  if (
    acquire.surface !== release.surface ||
    release.action !== "release"
  ) return false;

  if (acquire.precision === "exact" && release.precision === "exact") {
    return acquire.key === release.key;
  }

  if (acquire.surface === "dynamic-property") {
    const acquireReceiver = acquire.key.split(":")[0];
    const releaseReceiver = release.key.split(":")[0];
    return (
      acquireReceiver === releaseReceiver &&
      release.key.endsWith(":*")
    );
  }

  return (
    acquire.key === release.key ||
    release.key === "system"
  );
}

function analyzeScript(
  script: ParsedScriptFile,
): ArenaCleanupTerminalAssessment[] {
  const mutations = extractMutations(script);
  const acquisitions = mutations.filter(
    (item) => item.action === "acquire",
  );
  const releases = mutations.filter(
    (item) => item.action === "release",
  );
  const graph = graphFor(script);

  return terminalRegions(script).map((terminalRegion) => {
    const regions = reachable(graph, terminalRegion);
    const surfaces = [
      ...new Map(
        acquisitions.map((item) => [
          mutationKey(item.surface, item.key),
          item,
        ]),
      ).values(),
    ].map((acquire): ArenaCleanupSurfaceAssessment => {
      const matching = releases.filter((release) =>
        releaseMatches(acquire, release)
      );
      const reachableMatching = matching.filter((release) =>
        regions.includes(release.region)
      );
      const exact =
        acquire.precision === "exact" &&
        reachableMatching.some(
          (release) =>
            release.precision === "exact" &&
            release.key === acquire.key,
        );
      const status =
        exact
          ? "proven" as const
          : reachableMatching.length > 0
            ? "partial" as const
            : "unresolved" as const;

      return {
        surface: acquire.surface,
        key: acquire.key,
        acquisitionRegions: acquisitions
          .filter((item) =>
            item.surface === acquire.surface &&
            item.key === acquire.key
          )
          .map((item) => item.region)
          .filter((value, index, array) =>
            array.indexOf(value) === index
          )
          .sort(),
        releaseRegions: reachableMatching
          .map((item) => item.region)
          .filter((value, index, array) =>
            array.indexOf(value) === index
          )
          .sort(),
        releaseReachableFromTerminal:
          reachableMatching.length > 0,
        precision:
          exact
            ? "exact"
            : "surface-level",
        status,
      };
    }).sort((a, b) =>
      a.surface.localeCompare(b.surface) ||
      a.key.localeCompare(b.key)
    );

    return {
      scriptId: script.identifier,
      terminalRegion,
      reachableRegions: regions,
      surfaces,
      exactProven: surfaces.filter(
        (item) => item.status === "proven",
      ).length,
      partial: surfaces.filter(
        (item) => item.status === "partial",
      ).length,
      unresolved: surfaces.filter(
        (item) => item.status === "unresolved",
      ).length,
    };
  });
}

export function analyzeArenaCleanupSurfaces(
  scripts: readonly ParsedScriptFile[],
): ArenaCleanupSurfaceAnalysis {
  const terminalAssessments = scripts.flatMap(analyzeScript);
  const acquiredSurfaces = scripts.reduce(
    (sum, script) =>
      sum +
      extractMutations(script).filter(
        (item) => item.action === "acquire",
      ).length,
    0,
  );

  return {
    acquiredSurfaces,
    terminalAssessments,
    exactProven: terminalAssessments.reduce(
      (sum, item) => sum + item.exactProven,
      0,
    ),
    partial: terminalAssessments.reduce(
      (sum, item) => sum + item.partial,
      0,
    ),
    unresolved: terminalAssessments.reduce(
      (sum, item) => sum + item.unresolved,
      0,
    ),
  };
}
