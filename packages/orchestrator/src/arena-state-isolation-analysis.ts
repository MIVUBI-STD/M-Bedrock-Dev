import type {
  ParsedScriptFile,
  ScriptMethodCall,
} from "../../../analyzers/scripts/src/index.js";

export type ArenaStateScope =
  | "arena-local"
  | "player-local"
  | "entity-local"
  | "world-global"
  | "module-shared"
  | "unknown";

export type ArenaStateIsolationStatus =
  | "isolated"
  | "partition-proof-required"
  | "shared-global"
  | "unknown";

export interface ArenaStateIsolationObservation {
  scriptId: string;
  region: string;
  surface:
    | "dynamic-property"
    | "scoreboard"
    | "world-property"
    | "world-command"
    | "module-state";
  key: string;
  scope: ArenaStateScope;
  status: ArenaStateIsolationStatus;
  reason: string;
}

export interface ArenaStateIsolationAnalysis {
  arenaRegions: number;
  observations: readonly ArenaStateIsolationObservation[];
  isolated: number;
  partitionProofRequired: number;
  sharedGlobal: number;
  unknown: number;
}

function graphFor(
  script: ParsedScriptFile,
): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  for (const call of script.localFunctionCalls) {
    const targets =
      graph.get(call.callerRegion) ??
      new Set<string>();
    targets.add(call.targetRegion);
    graph.set(call.callerRegion, targets);
  }
  return graph;
}

function reachable(
  graph: ReadonlyMap<string, ReadonlySet<string>>,
  roots: readonly string[],
): Set<string> {
  const seen = new Set<string>(roots);
  const queue = [...roots];
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

function arenaRegions(
  script: ParsedScriptFile,
): Set<string> {
  const roots = [
    ...new Set(
      (script.arenaAuthorityPaths ?? [])
        .map((item) => item.executionRegion),
    ),
  ];
  return reachable(graphFor(script), roots);
}

function receiverScope(
  receiver: string | undefined,
): ArenaStateScope {
  const value = receiver?.trim() ?? "";
  if (/^(?:world|serverWorld)$/i.test(value)) {
    return "world-global";
  }
  if (/(?:^|\.)(?:player|participant|member)$/i.test(value)) {
    return "player-local";
  }
  if (/(?:^|\.)(?:entity|mob|npc)$/i.test(value)) {
    return "entity-local";
  }
  if (/(?:arena|session|round)/i.test(value)) {
    return "arena-local";
  }
  return "unknown";
}

function statusForScope(
  scope: ArenaStateScope,
): ArenaStateIsolationStatus {
  if (
    scope === "arena-local" ||
    scope === "player-local" ||
    scope === "entity-local"
  ) {
    return "isolated";
  }
  if (scope === "world-global") {
    return "shared-global";
  }
  if (scope === "module-shared") {
    return "partition-proof-required";
  }
  return "unknown";
}

function scoreboardObservation(
  script: ParsedScriptFile,
  call: ScriptMethodCall,
  region: string,
): ArenaStateIsolationObservation | undefined {
  if (
    call.receiverType !== "Scoreboard" &&
    call.receiverType !== "ScoreboardObjective"
  ) {
    return undefined;
  }

  return {
    scriptId: script.identifier,
    region,
    surface: "scoreboard",
    key: call.symbol,
    scope: "world-global",
    status: "partition-proof-required",
    reason:
      "Scoreboard state is world-shared. Arena isolation requires objective/participant keys to prove arena partitioning.",
  };
}

function commandObservation(
  script: ParsedScriptFile,
  command: ParsedScriptFile["commandLiterals"][number],
): ArenaStateIsolationObservation | undefined {
  const raw = command.command.trim().replace(/^\//, "");
  const head = raw.split(/\s+/)[0]?.toLowerCase();
  if (
    head !== "gamerule" &&
    head !== "difficulty" &&
    head !== "time" &&
    head !== "weather"
  ) {
    return undefined;
  }

  return {
    scriptId: script.identifier,
    region: command.executionRegion ?? "module",
    surface: "world-command",
    key: raw,
    scope: "world-global",
    status: "shared-global",
    reason:
      "The command mutates world-global behavior and can affect concurrent arenas unless ownership/arbitration is proven.",
  };
}

function analyzeScript(
  script: ParsedScriptFile,
): {
  regions: Set<string>;
  observations: ArenaStateIsolationObservation[];
} {
  const regions = arenaRegions(script);
  const observations: ArenaStateIsolationObservation[] = [];

  for (const access of script.dynamicProperties) {
    if (
      access.operation !== "set" &&
      access.operation !== "delete" &&
      access.operation !== "clear"
    ) {
      continue;
    }
    const region = access.executionRegion ?? "module";
    if (!regions.has(region)) continue;

    const scope = receiverScope(access.receiverHint);
    observations.push({
      scriptId: script.identifier,
      region,
      surface: "dynamic-property",
      key:
        (access.receiverHint ?? "unknown") +
        ":" +
        (access.propertyId ?? "*"),
      scope,
      status:
        scope === "world-global"
          ? "partition-proof-required"
          : statusForScope(scope),
      reason:
        scope === "world-global"
          ? "World dynamic properties are shared by all arenas; the property key must prove arena/session partitioning."
          : "Dynamic-property receiver scope inferred from the static receiver expression.",
    });
  }

  for (const call of script.methodCalls) {
    const region = call.executionRegion ?? "module";
    if (!regions.has(region)) continue;
    const observation = scoreboardObservation(
      script,
      call,
      region,
    );
    if (observation) observations.push(observation);
  }

  for (const write of script.propertyWrites) {
    if (
      write.receiverType !== "World" &&
      write.receiverType !== "System"
    ) {
      continue;
    }
    observations.push({
      scriptId: script.identifier,
      region: "module",
      surface: "world-property",
      key: write.symbol,
      scope: "world-global",
      status: "shared-global",
      reason:
        "World/System property mutation is process- or world-shared and requires explicit arbitration for concurrent arenas.",
    });
  }

  for (const command of script.commandLiterals) {
    const region = command.executionRegion ?? "module";
    if (!regions.has(region)) continue;
    const observation =
      commandObservation(script, command);
    if (observation) observations.push(observation);
  }

  for (const mutation of script.stateMutations ?? []) {
    if (!regions.has(mutation.executionRegion)) continue;
    const target = mutation.target;
    const scope: ArenaStateScope =
      /(?:arena|session|round)/i.test(target)
        ? "arena-local"
        : /(?:player|participant|member)/i.test(target)
          ? "player-local"
          : target.includes(".")
            ? "unknown"
            : "module-shared";

    observations.push({
      scriptId: script.identifier,
      region: mutation.executionRegion,
      surface: "module-state",
      key: target,
      scope,
      status: statusForScope(scope),
      reason:
        scope === "module-shared"
          ? "A module-level state target is mutated from arena execution and requires an arena-keyed ownership proof."
          : "State scope inferred conservatively from the mutation target expression.",
    });
  }

  return { regions, observations };
}

export function analyzeArenaStateIsolation(
  scripts: readonly ParsedScriptFile[],
): ArenaStateIsolationAnalysis {
  const analyzed = scripts.map(analyzeScript);
  const observations = analyzed
    .flatMap((item) => item.observations)
    .sort((a, b) =>
      a.scriptId.localeCompare(b.scriptId) ||
      a.region.localeCompare(b.region) ||
      a.surface.localeCompare(b.surface) ||
      a.key.localeCompare(b.key)
    );

  return {
    arenaRegions: analyzed.reduce(
      (sum, item) => sum + item.regions.size,
      0,
    ),
    observations,
    isolated: observations.filter(
      (item) => item.status === "isolated",
    ).length,
    partitionProofRequired: observations.filter(
      (item) =>
        item.status === "partition-proof-required",
    ).length,
    sharedGlobal: observations.filter(
      (item) => item.status === "shared-global",
    ).length,
    unknown: observations.filter(
      (item) => item.status === "unknown",
    ).length,
  };
}
