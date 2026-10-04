import type {
  ParsedScriptFile,
  ScriptMethodCall,
} from "../../../../analyzers/scripts/src/index.js";
import type {
  StateAuthorityContract,
  StateSurfaceKind,
} from "../../../project-model/src/index.js";

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
    | "world-player-enumeration"
    | "module-state";
  key: string;
  scope: ArenaStateScope;
  status: ArenaStateIsolationStatus;
  reason: string;
  authorityContractIds?: readonly string[];
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

function normalizedExpression(
  value: string,
): string {
  return value
    .replace(/\s+/g, "")
    .toLowerCase();
}

function escapedRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^$()|[\]\\]/g,
    "\\function escapedRegex(
  value: string,
): string {
  return value.replace(
    /[.*+?^$()|[\]\\]/g,
    "\\function expressionUsesAuthority(
  expression: string | undefined,
  authorities: readonly string[],
): boolean {
  if (!expression) return false;
  const normalized =
    normalizedExpression(expression);
  return authorities.some((authority) => {
    const candidate =
      normalizedExpression(authority);
    return (
      candidate.length > 0 &&
      (
        normalized.includes(candidate) ||
        normalized.includes(candidate + ".id") ||
        normalized.includes(candidate + ".generation") ||
        normalized.includes(candidate + ".index")
      )
    );
  });
}
",
  );
}

function expressionUsesAuthority",
  );
}

function expressionUsesAuthority(
  expression: string | undefined,
  authorities: readonly string[],
): boolean {
  if (!expression) return false;
  const normalized =
    normalizedExpression(expression);

  return authorities.some((authority) => {
    const candidate =
      normalizedExpression(authority);
    if (!candidate) return false;

    if (
      /^[a-z_$][a-z0-9_$]*$/i.test(
        candidate,
      )
    ) {
      const token =
        new RegExp(
          "(^|[^a-z0-9_$])" +
            escapedRegex(candidate) +
            "(?=$|[^a-z0-9_$])",
          "i",
        );
      return token.test(normalized);
    }

    return normalized.includes(candidate);
  });
}

function scoreboardObservation(
  script: ParsedScriptFile,
  call: ScriptMethodCall,
  region: string,
  authorities: readonly string[],
): ArenaStateIsolationObservation | undefined {
  if (
    call.receiverType !== "ScoreboardObjective" ||
    ![
      "setScore",
      "addScore",
      "removeParticipant",
    ].includes(call.method)
  ) {
    return undefined;
  }

  const participant =
    call.argumentTexts?.[0];

  if (
    expressionUsesAuthority(
      participant,
      authorities,
    )
  ) {
    return {
      scriptId: script.identifier,
      region,
      surface: "scoreboard",
      key:
        call.symbol +
        ":" +
        participant,
      scope: "arena-local",
      status: "isolated",
      reason:
        "Scoreboard participant expression is explicitly keyed by the authored arena authority expression.",
    };
  }

  if (
    participant &&
    /(?:player|participant|member|scoreboardidentity)/i.test(
      participant,
    )
  ) {
    return {
      scriptId: script.identifier,
      region,
      surface: "scoreboard",
      key:
        call.symbol +
        ":" +
        participant,
      scope: "player-local",
      status: "isolated",
      reason:
        "Scoreboard participant expression is player/participant scoped.",
    };
  }

  return {
    scriptId: script.identifier,
    region,
    surface: "scoreboard",
    key:
      call.symbol +
      ":" +
      (participant ?? "*"),
    scope: "world-global",
    status: "partition-proof-required",
    reason:
      "Scoreboard objective is world-shared and the participant expression does not prove arena/player partitioning.",
  };
}

function worldPlayerEnumerationObservation(
  script: ParsedScriptFile,
  call: ScriptMethodCall,
  region: string,
  authorities: readonly string[],
): ArenaStateIsolationObservation | undefined {
  if (
    call.receiverType !== "World" ||
    !["getPlayers", "getAllPlayers"].includes(call.method)
  ) {
    return undefined;
  }

  const query =
    (call.argumentTexts ?? []).join(" ");
  const authorityPartitioned =
    expressionUsesAuthority(query, authorities);

  return {
    scriptId: script.identifier,
    region,
    surface: "world-player-enumeration",
    key:
      call.symbol +
      "(" +
      query +
      ")",
    scope:
      authorityPartitioned
        ? "arena-local"
        : "world-global",
    status:
      authorityPartitioned
        ? "isolated"
        : "partition-proof-required",
    reason:
      authorityPartitioned
        ? "World player enumeration is explicitly filtered by the authored arena authority expression."
        : "Arena flow enumerates world players without proving arena partitioning. Downstream player/tag/state mutations must prove an arena filter or arena-context proxy before isolation can close.",
  };
}

function commandObservation(
  script: ParsedScriptFile,
  command: ParsedScriptFile["commandLiterals"][number],
  authorities: readonly string[],
): ArenaStateIsolationObservation | undefined {
  const raw = command.command.trim().replace(/^\//, "");
  const head = raw.split(/\s+/)[0]?.toLowerCase();

  if (
    head === "gamerule" ||
    head === "difficulty" ||
    head === "time" ||
    head === "weather"
  ) {
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

  if (head === "tickingarea") {
    const authorityPartitioned =
      expressionUsesAuthority(raw, authorities);

    return {
      scriptId: script.identifier,
      region: command.executionRegion ?? "module",
      surface: "world-command",
      key: raw,
      scope: authorityPartitioned ? "arena-local" : "world-global",
      status: authorityPartitioned ? "isolated" : "partition-proof-required",
      reason: authorityPartitioned
        ? "Ticking-area command includes the authored arena authority expression, providing arena-specific resource partitioning."
        : "Ticking-area names are world-shared resources. Arena flow using a non-partitioned name requires proof that concurrent arenas cannot remove or replace another arena's residency resource.",
    };
  }

  const targetsAllPlayers =
    /(^|\s)@a(?:\[|\b)/i.test(raw);
  const mutatesPlayerOrWorld =
    /(?:^|\s)(?:fill|setblock|clone|tag|kill|tp|teleport|clear|give|effect|gamemode|scoreboard)\b/i.test(
      raw,
    );

  if (targetsAllPlayers && mutatesPlayerOrWorld) {
    const authorityPartitioned =
      expressionUsesAuthority(raw, authorities);

    return {
      scriptId: script.identifier,
      region: command.executionRegion ?? "module",
      surface: "world-command",
      key: raw,
      scope: authorityPartitioned ? "arena-local" : "world-global",
      status: authorityPartitioned ? "isolated" : "partition-proof-required",
      reason: authorityPartitioned
        ? "Global-selector command is explicitly partitioned by the authored arena authority expression."
        : "Arena flow mutates players or nearby world state through a global @a selector. Arena-context translation or an equivalent partitioning guard must be proven before cross-arena isolation can close.",
    };
  }

  return undefined;
}

function analyzeScript(
  script: ParsedScriptFile,
): {
  regions: Set<string>;
  observations: ArenaStateIsolationObservation[];
} {
  const regions = arenaRegions(script);
  const authorities = [
    ...new Set(
      (script.arenaAuthorityPaths ?? [])
        .map((item) => item.arenaExpression)
        .filter(Boolean),
    ),
  ];
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

    const receiver =
      receiverScope(access.receiverHint);
    const keyExpression =
      access.propertyExpression ??
      access.propertyId;

    const authorityPartitioned =
      receiver === "world-global" &&
      expressionUsesAuthority(
        keyExpression,
        authorities,
      );
    const playerPartitioned =
      receiver === "world-global" &&
      keyExpression !== undefined &&
      /(?:player|participant|member|scoreboardidentity)/i.test(
        keyExpression,
      );

    const scope: ArenaStateScope =
      authorityPartitioned
        ? "arena-local"
        : playerPartitioned
          ? "player-local"
          : receiver;

    observations.push({
      scriptId: script.identifier,
      region,
      surface: "dynamic-property",
      key:
        (access.receiverHint ?? "unknown") +
        ":" +
        (
          access.propertyExpression ??
          access.propertyId ??
          "*"
        ),
      scope,
      status:
        authorityPartitioned ||
        playerPartitioned
          ? "isolated"
          : scope === "world-global"
            ? "partition-proof-required"
            : statusForScope(scope),
      reason:
        authorityPartitioned
          ? "World dynamic-property key expression is explicitly partitioned by the authored arena authority expression."
          : playerPartitioned
            ? "World dynamic-property key expression is explicitly partitioned by player/participant identity."
            : scope === "world-global"
              ? "World dynamic properties are shared by all arenas; the property key must prove arena/session partitioning."
              : "Dynamic-property receiver scope inferred from the static receiver expression.",
    });
  }

  for (const call of script.methodCalls) {
    const region = call.executionRegion ?? "module";
    if (!regions.has(region)) continue;
    const scoreboard = scoreboardObservation(
      script,
      call,
      region,
      authorities,
    );
    if (scoreboard) observations.push(scoreboard);

    const playerEnumeration =
      worldPlayerEnumerationObservation(
        script,
        call,
        region,
        authorities,
      );
    if (playerEnumeration) {
      observations.push(playerEnumeration);
    }
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
      commandObservation(
        script,
        command,
        authorities,
      );
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


function contractSurfaceMatches(
  observation: ArenaStateIsolationObservation,
  surface: {
    kind: StateSurfaceKind;
    key: string;
  },
): boolean {
  if (
    observation.surface === "dynamic-property" &&
    surface.kind === "dynamic-property"
  ) {
    return (
      observation.key === surface.key ||
      observation.key.endsWith(
        ":" + surface.key,
      )
    );
  }

  if (
    observation.surface === "scoreboard" &&
    surface.kind === "scoreboard"
  ) {
    return (
      observation.key === surface.key ||
      observation.key.includes(
        surface.key,
      )
    );
  }

  if (
    observation.surface === "module-state" &&
    surface.kind === "script-memory"
  ) {
    return (
      observation.key === surface.key ||
      observation.key.endsWith(
        "." + surface.key,
      )
    );
  }

  return false;
}

function applyAuthorityContracts(
  observations: readonly ArenaStateIsolationObservation[],
  contracts: readonly StateAuthorityContract[],
): ArenaStateIsolationObservation[] {
  return observations.map((observation) => {
    const matches = contracts.filter((contract) => {
      if (
        contract.scope !== "arena" &&
        contract.scope !== "round" &&
        contract.scope !== "player" &&
        contract.scope !== "entity"
      ) {
        return false;
      }

      return [
        contract.authority,
        ...contract.mirrors,
      ].some((surface) =>
        contractSurfaceMatches(
          observation,
          surface,
        )
      );
    });

    if (matches.length === 0) {
      return observation;
    }

    return {
      ...observation,
      scope:
        matches.some(
          (item) =>
            item.scope === "arena" ||
            item.scope === "round",
        )
          ? "arena-local"
          : matches.some(
              (item) =>
                item.scope === "player",
            )
            ? "player-local"
            : "entity-local",
      status: "isolated",
      reason:
        "Authored state-authority contract proves this surface is partitioned by " +
        [
          ...new Set(
            matches.map(
              (item) => item.scope,
            ),
          ),
        ].join("/") +
        " scope.",
      authorityContractIds:
        matches.map(
          (item) => item.id,
        ).sort(),
    };
  });
}

export function analyzeArenaStateIsolation(
  scripts: readonly ParsedScriptFile[],
  contracts: readonly StateAuthorityContract[] = [],
): ArenaStateIsolationAnalysis {
  const analyzed = scripts.map(analyzeScript);
  const observations = applyAuthorityContracts(
    analyzed.flatMap(
      (item) => item.observations,
    ),
    contracts,
  ).sort((a, b) =>
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
