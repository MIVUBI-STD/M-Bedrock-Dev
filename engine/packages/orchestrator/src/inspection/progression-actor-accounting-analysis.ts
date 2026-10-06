import type {
  CrossFileCallEdge,
  ParsedScriptFile,
  ScriptProgressionCounterEvidence,
} from "../../../../analyzers/scripts/src/index.js";
import {
  analyzeEntityTransitionReachability,
  type ParsedEntityDefinition,
} from "../../../../analyzers/entities/src/index.js";
import type {
  EntityEventExternalEvidence,
} from "./entity-event-evidence.js";
import type {
  ScriptProgressionActiveEventEvidence,
} from "../../../../analyzers/scripts/src/index.js";
import type {
  ArenaLifecycleAnalysis,
  ArenaLifecycleTerminalAssessment,
} from "../arena-lifecycle-analysis.js";

export type ProgressionCounterKind =
  | "variable"
  | "scoreboard";

export type ProgressionCounterStatus =
  | "reconciled-from-matched-actor-lifecycle"
  | "actor-identity-mismatch"
  | "spawn-quantity-mismatch"
  | "instant-despawn-without-reconciliation"
  | "active-instant-despawn-without-reconciliation"
  | "missing-reconciliation"
  | "unresolved";

export interface ProgressionCounterAssessment {
  readonly scriptId: string;
  readonly counterId: string;
  readonly kind: ProgressionCounterKind;
  readonly growthWrites: number;
  readonly decrementWrites: number;
  readonly replacementWrites: number;
  readonly completionChecks: number;
  readonly lifecycleLinkedDecrements: number;
  readonly deathLinkedDecrements: number;
  readonly removeLinkedDecrements: number;
  readonly reconciliationLifecycleKinds:
    readonly ("death" | "remove")[];
  readonly deathLifecycleActorIdentifiers:
    readonly string[];
  readonly removeLifecycleActorIdentifiers:
    readonly string[];
  readonly scriptedRemovalActorIdentifiers:
    readonly string[];
  readonly uncoveredScriptedRemovalActorIdentifiers:
    readonly string[];
  readonly scriptedRemovalCoverage:
    | "covered"
    | "uncovered"
    | "none"
    | "unresolved";
  readonly terminalOnlyScriptedRemovalActorIdentifiers:
    readonly string[];
  readonly nonTerminalScriptedRemovalActorIdentifiers:
    readonly string[];
  readonly unresolvedScriptedRemovalActorIdentifiers:
    readonly string[];
  readonly scriptedRemovalScope:
    | "terminal-only"
    | "non-terminal"
    | "unresolved"
    | "none";
  readonly immediateDespawnActorIdentifiers:
    readonly string[];
  readonly conditionalDespawnActorIdentifiers:
    readonly string[];
  readonly reachableConditionalDespawnActorIdentifiers:
    readonly string[];
  readonly terminalOnlyConditionalDespawnActorIdentifiers:
    readonly string[];
  readonly inactiveConditionalDespawnActorIdentifiers:
    readonly string[];
  readonly activeInstantDespawnActorIdentifiers:
    readonly string[];
  readonly uncoveredActiveInstantDespawnActorIdentifiers:
    readonly string[];
  readonly uncoveredImmediateDespawnActorIdentifiers:
    readonly string[];
  readonly unresolvedConditionalDespawnActorIdentifiers:
    readonly string[];
  readonly quantityComparableGrowths: number;
  readonly quantityMatchedGrowths: number;
  readonly quantityMismatchGrowths: number;
  readonly spawnQuantityStatus:
    | "matched"
    | "mismatch"
    | "unresolved"
    | "not-applicable";
  readonly actorAccountingCandidate: boolean;
  readonly spawnLinkedActorIdentifiers:
    readonly string[];
  readonly lifecycleActorIdentifiers:
    readonly string[];
  readonly matchedActorIdentifiers:
    readonly string[];
  readonly actorIdentityStatus:
    | "matched"
    | "mismatch"
    | "unresolved"
    | "not-applicable";
  readonly status: ProgressionCounterStatus;
  readonly reasons: readonly string[];
}

export interface ProgressionActorAccountingAnalysis {
  readonly counters:
    readonly ProgressionCounterAssessment[];
  readonly provenMissingReconciliation: number;
  readonly provenActorIdentityMismatch: number;
  readonly provenSpawnQuantityMismatch: number;
  readonly scriptedRemovalCoverageGaps: number;
  readonly terminalOnlyScriptedRemovalCounters: number;
  readonly nonTerminalScriptedRemovalCounters: number;
  readonly provenImmediateDespawnWithoutReconciliation: number;
  readonly conditionalDespawnUnknowns: number;
  readonly reachableConditionalDespawnCounters: number;
  readonly terminalOnlyConditionalDespawnCounters: number;
  readonly inactiveConditionalDespawnCounters: number;
  readonly provenActiveInstantDespawnWithoutReconciliation: number;
  readonly reconciledFromMatchedActorLifecycle: number;
  readonly unresolvedCounters: number;
}

export type ProgressionActorAccountingInput =
  | ParsedScriptFile
  | {
      readonly parsed: ParsedScriptFile;
      readonly text?: string;
    };

interface NormalizedScript {
  readonly parsed: ParsedScriptFile;
  readonly text: string;
}

interface CounterEvidenceRecord {
  readonly scriptPath: string;
  readonly scriptId: string;
  readonly counterId: string;
  readonly kind: ProgressionCounterKind;
  readonly operation:
    | "growth"
    | "decrement"
    | "replacement"
    | "completion-check";
  readonly executionRegion: string;
  readonly amount?: number;
  readonly executionShape:
    | "single"
    | "conditional"
    | "repeated"
    | "unknown";
}

interface SpawnEvidenceRecord {
  readonly scriptPath: string;
  readonly executionRegion: string;
  readonly actorIdentifier: string;
  readonly executionShape:
    | "single"
    | "conditional"
    | "repeated"
    | "unknown";
  readonly sourceLine?: number;
}

interface LifecycleActorGuard {
  readonly scriptPath: string;
  readonly executionRegion: string;
  readonly actorIdentifier: string;
}

interface ScriptedRemovalEvidence {
  readonly scriptPath: string;
  readonly executionRegion: string;
  readonly actorIdentifier: string;
  readonly mechanism:
    | "entity-remove"
    | "entity-kill"
    | "command-kill";
}

interface EntityDespawnEvidence {
  readonly actorIdentifier: string;
  readonly kind:
    | "immediate"
    | "conditional";
  readonly basis: string;
}

const ACTOR_COUNTER_NAME =
  /(?:enemy|enemies|mob|mobs|remaining|alive)/i;

const SCOREBOARD_COUNTER_NAME =
  /(?:wave|enemy|enemies|mob|mobs|remaining|alive|objective|progress|count)/i;

function normalizedInput(
  input: ProgressionActorAccountingInput,
): NormalizedScript {
  return "parsed" in input
    ? {
        parsed: input.parsed,
        text: input.text ?? "",
      }
    : {
        parsed: input,
        text: "",
      };
}

function normalizeActorIdentifier(
  value: string,
): string {
  const trimmed = value.trim();
  const unquoted =
    (
      (
        trimmed.startsWith('"') &&
        trimmed.endsWith('"')
      ) ||
      (
        trimmed.startsWith("'") &&
        trimmed.endsWith("'")
      ) ||
      (
        trimmed.startsWith("`") &&
        trimmed.endsWith("`")
      )
    )
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted.toLowerCase();
}

function scoreboardEvidence(
  script: NormalizedScript,
): CounterEvidenceRecord[] {
  const output: CounterEvidenceRecord[] = [];
  for (
    const command of
      script.parsed.commandLiterals
  ) {
    const text =
      command.command
        .trim()
        .replace(/^\//, "");
    const mutation =
      /^scoreboard\s+players\s+(add|remove|set)\s+\S+\s+([A-Za-z0-9_.:-]+)\s+(-?\d+)/i.exec(
        text,
      );
    if (mutation) {
      const action =
        mutation[1]!.toLowerCase();
      const counterId =
        mutation[2]!;
      if (
        SCOREBOARD_COUNTER_NAME.test(
          counterId,
        )
      ) {
        const value =
          Number(mutation[3]!);
        const operation =
          action === "set"
            ? "replacement" as const
            : (
                action === "remove" &&
                value > 0
              ) ||
              (
                action === "add" &&
                value < 0
              )
              ? "decrement" as const
              : action === "add" &&
                  value > 0
                ? "growth" as const
                : undefined;
        if (operation) {
          output.push({
            scriptPath:
              script.parsed.source.relativePath,
            scriptId:
              script.parsed.identifier,
            counterId,
            kind: "scoreboard",
            operation,
            executionRegion:
              command.executionRegion ??
              "module",
            amount:
              operation === "growth" ||
              operation === "decrement"
                ? Math.abs(value)
                : undefined,
            executionShape: "unknown",
          });
        }
      }
    }

    const completion =
      /(?:if|unless)\s+score\s+\S+\s+([A-Za-z0-9_.:-]+)\s+matches\s+(?:\.\.)?0(?:\b|\.\.)[^\r\n]*\brun\s+([^\r\n]+)/i.exec(
        text,
      );
    if (
      completion &&
      SCOREBOARD_COUNTER_NAME.test(
        completion[1]!,
      ) &&
      /(?:next.*(?:wave|round|level|stage)|advance|progress|complete|finish|end(?:wave|round|level|stage)|proceed)/i.test(
        completion[2]!,
      )
    ) {
      output.push({
        scriptPath:
          script.parsed.source.relativePath,
        scriptId:
          script.parsed.identifier,
        counterId: completion[1]!,
        kind: "scoreboard",
        operation: "completion-check",
        executionRegion:
          command.executionRegion ??
          "module",
        executionShape: "unknown",
        sourceLine:
          command.source.range?.lineStart,
      });
    }
  }
  return output;
}

function variableEvidence(
  script: NormalizedScript,
): CounterEvidenceRecord[] {
  return (
    script.parsed
      .progressionCounterEvidence ?? []
  ).map((
    item:
      ScriptProgressionCounterEvidence,
  ) => ({
    scriptPath:
      script.parsed.source.relativePath,
    scriptId:
      script.parsed.identifier,
    counterId: item.counterId,
    kind: item.counterKind,
    operation: item.kind,
    executionRegion:
      item.executionRegion,
    amount: item.amount,
    executionShape:
      item.executionShape,
  }));
}

function localNode(
  path: string,
  region: string,
): string {
  return (
    "module:" +
    path +
    "#" +
    region
  );
}

function callGraph(
  scripts: readonly NormalizedScript[],
  crossFileCalls:
    readonly CrossFileCallEdge[],
): Map<string, Set<string>> {
  const graph =
    new Map<string, Set<string>>();
  const add = (
    from: string,
    to: string,
  ) => {
    const next =
      graph.get(from) ??
      new Set<string>();
    next.add(to);
    graph.set(from, next);
  };

  for (const script of scripts) {
    const path =
      script.parsed.source.relativePath;
    for (
      const call of
        script.parsed.localFunctionCalls
    ) {
      add(
        localNode(
          path,
          call.callerRegion,
        ),
        localNode(
          path,
          call.targetRegion,
        ),
      );
    }
  }

  for (const call of crossFileCalls) {
    if (
      call.status !== "resolved" ||
      call.targetModule === undefined
    ) {
      continue;
    }
    add(
      localNode(
        call.callerModule,
        call.callerRegion,
      ),
      localNode(
        call.targetModule,
        "function:" +
          call.targetExport,
      ),
    );
  }
  return graph;
}

function reachableFrom(
  roots: ReadonlySet<string>,
  graph:
    ReadonlyMap<
      string,
      ReadonlySet<string>
    >,
): Set<string> {
  const seen =
    new Set<string>(roots);
  const queue = [...roots];

  while (queue.length > 0) {
    const current =
      queue.shift()!;
    for (
      const next of
        graph.get(current) ?? []
    ) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

function reaches(
  from: string,
  to: string,
  graph:
    ReadonlyMap<
      string,
      ReadonlySet<string>
    >,
): boolean {
  return reachableFrom(
    new Set([from]),
    graph,
  ).has(to);
}

function lifecycleRootsByKind(
  scripts: readonly NormalizedScript[],
): {
  readonly death: Set<string>;
  readonly remove: Set<string>;
} {
  const death = new Set<string>();
  const remove = new Set<string>();

  for (const script of scripts) {
    const path =
      script.parsed.source.relativePath;
    for (
      const evidence of
        script.parsed
          .combatLifecycleEvidence ?? []
    ) {
      if (
        evidence.kind ===
        "death-subscription"
      ) {
        death.add(
          localNode(
            path,
            evidence.executionRegion,
          ),
        );
      }
    }
    for (
      const evidence of
        script.parsed
          .chunkLifecycleEvidence ?? []
    ) {
      if (
        evidence.kind ===
        "entity-remove-subscription"
      ) {
        remove.add(
          localNode(
            path,
            evidence.executionRegion,
          ),
        );
      }
    }
  }

  return { death, remove };
}

function spawnEvidence(
  scripts: readonly NormalizedScript[],
): SpawnEvidenceRecord[] {
  const output: SpawnEvidenceRecord[] = [];

  for (const script of scripts) {
    const path =
      script.parsed.source.relativePath;

    for (
      const spawn of
        script.parsed
          .progressionActorSpawnEvidence ??
        []
    ) {
      output.push({
        scriptPath: path,
        executionRegion:
          spawn.executionRegion,
        actorIdentifier:
          spawn.actorIdentifier,
        executionShape:
          spawn.executionShape,
        sourceLine:
          spawn.source.range?.lineStart,
      });
    }

    for (
      const command of
        script.parsed.commandLiterals
    ) {
      const match =
        /^\/?summon\s+([a-z0-9_.:-]+)/i.exec(
          command.command.trim(),
        );
      if (!match?.[1]) continue;
      output.push({
        scriptPath: path,
        executionRegion:
          command.executionRegion ??
          "module",
        actorIdentifier:
          normalizeActorIdentifier(
            match[1],
          ),
        executionShape: "unknown",
      });
    }
  }

  return output.filter(
    (item, index, all) =>
      all.findIndex((candidate) =>
        candidate.scriptPath ===
          item.scriptPath &&
        candidate.executionRegion ===
          item.executionRegion &&
        candidate.actorIdentifier ===
          item.actorIdentifier &&
        candidate.executionShape ===
          item.executionShape &&
        candidate.sourceLine ===
          item.sourceLine
      ) === index,
  );
}

function lifecycleActorGuards(
  scripts: readonly NormalizedScript[],
): LifecycleActorGuard[] {
  return scripts.flatMap((script) =>
    (
      script.parsed.economyEvidence ?? []
    ).flatMap((item) =>
      item.kind ===
        "death-entity-type-guard" &&
      item.entityIdentifier !== undefined
        ? [{
            scriptPath:
              script.parsed.source.relativePath,
            executionRegion:
              item.executionRegion,
            actorIdentifier:
              normalizeActorIdentifier(
                item.entityIdentifier,
              ),
          }]
        : [],
    )
  );
}

function scriptedRemovalEvidence(
  scripts: readonly NormalizedScript[],
  guards: readonly LifecycleActorGuard[],
): ScriptedRemovalEvidence[] {
  const output:
    ScriptedRemovalEvidence[] = [];

  for (const script of scripts) {
    const path =
      script.parsed.source.relativePath;
    const regionGuards = new Map<
      string,
      string[]
    >();

    for (
      const guard of guards.filter(
        (item) =>
          item.scriptPath === path,
      )
    ) {
      regionGuards.set(
        guard.executionRegion,
        [
          ...(regionGuards.get(
            guard.executionRegion,
          ) ?? []),
          guard.actorIdentifier,
        ],
      );
    }

    for (
      const call of
        script.parsed.methodCalls
    ) {
      if (
        call.executionRegion ===
          undefined ||
        (
          call.method !== "remove" &&
          call.method !== "kill"
        ) ||
        (
          call.receiverType !== "Entity" &&
          call.receiverType !== "Player"
        )
      ) {
        continue;
      }

      const actorIds =
        regionGuards.get(
          call.executionRegion,
        ) ?? [];
      for (const actorIdentifier of actorIds) {
        output.push({
          scriptPath: path,
          executionRegion:
            call.executionRegion,
          actorIdentifier,
          mechanism:
            call.method === "remove"
              ? "entity-remove"
              : "entity-kill",
        });
      }
    }

    for (
      const command of
        script.parsed.commandLiterals
    ) {
      const normalized =
        command.command
          .trim()
          .replace(/^\//, "");
      const kill =
        /^kill\s+@e\[([^\]]+)\]/i.exec(
          normalized,
        );
      if (!kill?.[1]) continue;
      const typeMatch =
        /(?:^|,)\s*type\s*=\s*([^,!\s\]]+)/i.exec(
          kill[1],
        );
      if (
        !typeMatch?.[1] ||
        typeMatch[1].startsWith("!")
      ) {
        continue;
      }
      output.push({
        scriptPath: path,
        executionRegion:
          command.executionRegion ??
          "module",
        actorIdentifier:
          normalizeActorIdentifier(
            typeMatch[1],
          ),
        mechanism: "command-kill",
      });
    }
  }

  return output
    .filter((item, index, all) =>
      all.findIndex((candidate) =>
        candidate.scriptPath ===
          item.scriptPath &&
        candidate.executionRegion ===
          item.executionRegion &&
        candidate.actorIdentifier ===
          item.actorIdentifier &&
        candidate.mechanism ===
          item.mechanism
      ) === index
    )
    .sort((a, b) =>
      a.actorIdentifier.localeCompare(
        b.actorIdentifier,
      ) ||
      a.executionRegion.localeCompare(
        b.executionRegion,
      )
    );
}

function assessmentIncludesRegion(
  assessment:
    ArenaLifecycleTerminalAssessment,
  removal: ScriptedRemovalEvidence,
): boolean {
  const qualified =
    localNode(
      removal.scriptPath,
      removal.executionRegion,
    );
  return (
    assessment.terminalRegion ===
      removal.executionRegion ||
    assessment.terminalRegion ===
      qualified ||
    assessment.reachableRegions.includes(
      removal.executionRegion,
    ) ||
    assessment.reachableRegions.includes(
      qualified,
    )
  );
}

function terminalReachableRegions(
  lifecycle:
    ArenaLifecycleAnalysis | undefined,
): Set<string> {
  const output = new Set<string>();
  for (
    const assessment of
      lifecycle?.assessments ?? []
  ) {
    if (assessment.status !== "proven") {
      continue;
    }
    output.add(
      assessment.terminalRegion,
    );
    for (
      const region of
        assessment.reachableRegions
    ) {
      output.add(region);
    }
  }
  return output;
}

function incomingCallers(
  scripts: readonly NormalizedScript[],
  crossFileCalls:
    readonly CrossFileCallEdge[],
): Map<string, Set<string>> {
  const output =
    new Map<string, Set<string>>();
  const add = (
    target: string,
    caller: string,
  ) => {
    const values =
      output.get(target) ??
      new Set<string>();
    values.add(caller);
    output.set(target, values);
  };

  for (const script of scripts) {
    const path =
      script.parsed.source.relativePath;
    for (
      const call of
        script.parsed.localFunctionCalls
    ) {
      add(
        localNode(
          path,
          call.targetRegion,
        ),
        localNode(
          path,
          call.callerRegion,
        ),
      );
    }
  }

  for (const call of crossFileCalls) {
    if (
      call.status !== "resolved" ||
      call.targetModule === undefined
    ) {
      continue;
    }
    add(
      localNode(
        call.targetModule,
        "function:" +
          call.targetExport,
      ),
      localNode(
        call.callerModule,
        call.callerRegion,
      ),
    );
  }

  return output;
}

function scriptedRemovalScope(
  removal: ScriptedRemovalEvidence,
  lifecycle:
    ArenaLifecycleAnalysis | undefined,
  terminalRegions:
    ReadonlySet<string>,
  incoming:
    ReadonlyMap<
      string,
      ReadonlySet<string>
    >,
): "terminal-only" | "non-terminal" | "unresolved" {
  const node =
    localNode(
      removal.scriptPath,
      removal.executionRegion,
    );
  const provenAssessments =
    (lifecycle?.assessments ?? [])
      .filter((assessment) =>
        assessment.status === "proven"
      );
  const directTerminal =
    provenAssessments.some(
      (assessment) =>
        assessmentIncludesRegion(
          assessment,
          removal,
        ) &&
        (
          assessment.terminalRegion ===
            removal.executionRegion ||
          assessment.terminalRegion ===
            node
        ),
    );

  const callers =
    incoming.get(node) ??
    new Set<string>();
  const anyTerminalPath =
    provenAssessments.some(
      (assessment) =>
        assessmentIncludesRegion(
          assessment,
          removal,
        ),
    );

  if (
    directTerminal &&
    [...callers].every((caller) =>
      terminalRegions.has(caller)
    )
  ) {
    return "terminal-only";
  }

  if (
    anyTerminalPath &&
    callers.size > 0 &&
    [...callers].every((caller) =>
      terminalRegions.has(caller)
    )
  ) {
    return "terminal-only";
  }

  if (
    [...callers].some((caller) =>
      !terminalRegions.has(caller)
    )
  ) {
    return "non-terminal";
  }

  return "unresolved";
}

function directRemovalCanReachDecrement(
  removal: ScriptedRemovalEvidence,
  decrements:
    readonly CounterEvidenceRecord[],
  graph:
    ReadonlyMap<
      string,
      ReadonlySet<string>
    >,
): boolean {
  const from =
    localNode(
      removal.scriptPath,
      removal.executionRegion,
    );
  return decrements.some((item) => {
    const to =
      localNode(
        item.scriptPath,
        item.executionRegion,
      );
    return (
      from === to ||
      reaches(
        from,
        to,
        graph,
      )
    );
  });
}

function followEntityEvents(
  entity: ParsedEntityDefinition,
  roots: readonly string[],
): Set<string> {
  const defined =
    new Set(Object.keys(entity.events));
  const seen = new Set<string>();
  const queue =
    roots.filter((event) =>
      defined.has(event)
    );
  while (queue.length > 0) {
    const event = queue.shift()!;
    if (seen.has(event)) continue;
    seen.add(event);
    for (
      const next of
        entity.events[event]
          ?.triggerEvents ?? []
    ) {
      if (
        defined.has(next) &&
        !seen.has(next)
      ) {
        queue.push(next);
      }
    }
  }
  return seen;
}

function conditionalDespawnEventKinds(
  entity: ParsedEntityDefinition,
): Map<string, "instant" | "despawn" | "mixed"> {
  const groupKinds =
    new Map<
      string,
      "instant" | "despawn" | "mixed"
    >();

  for (
    const [groupId, components] of
      Object.entries(
        entity.componentGroups,
      )
  ) {
    const hasInstant =
      components.includes(
        "minecraft:instant_despawn",
      );
    const hasDespawn =
      components.includes(
        "minecraft:despawn",
      );
    if (!hasInstant && !hasDespawn) {
      continue;
    }
    groupKinds.set(
      groupId,
      hasInstant && hasDespawn
        ? "mixed"
        : hasInstant
          ? "instant"
          : "despawn",
    );
  }

  const output =
    new Map<
      string,
      "instant" | "despawn" | "mixed"
    >();
  for (
    const [eventId, mutation] of
      Object.entries(entity.events)
  ) {
    const kinds =
      mutation.addGroups
        .map((groupId) =>
          groupKinds.get(groupId)
        )
        .filter(
          (
            value,
          ): value is
            | "instant"
            | "despawn"
            | "mixed" =>
            value !== undefined,
        );
    if (kinds.length === 0) {
      continue;
    }
    const instant =
      kinds.some(
        (kind) =>
          kind === "instant" ||
          kind === "mixed",
      );
    const despawn =
      kinds.some(
        (kind) =>
          kind === "despawn" ||
          kind === "mixed",
      );
    output.set(
      eventId,
      instant && despawn
        ? "mixed"
        : instant
          ? "instant"
          : "despawn",
    );
  }
  return output;
}

function conditionalDespawnEvents(
  entity: ParsedEntityDefinition,
): string[] {
  const despawnGroups =
    new Set(
      Object.entries(
        entity.componentGroups,
      )
        .filter(([, components]) =>
          components.includes(
            "minecraft:despawn",
          ) ||
          components.includes(
            "minecraft:instant_despawn",
          )
        )
        .map(([groupId]) => groupId),
    );

  return Object.entries(entity.events)
    .filter(([, mutation]) =>
      mutation.addGroups.some(
        (groupId) =>
          despawnGroups.has(groupId),
      )
    )
    .map(([eventId]) => eventId)
    .sort();
}

function eventEvidenceMatchesEntity(
  evidence:
    EntityEventExternalEvidence,
  actorIdentifier: string,
): boolean {
  return (
    evidence.entityIdentifier !== undefined &&
    normalizeActorIdentifier(
      evidence.entityIdentifier,
    ) === actorIdentifier
  );
}

function lifecycleScopeForRegion(
  path: string,
  region: string | undefined,
  lifecycle:
    ArenaLifecycleAnalysis | undefined,
  terminalRegions:
    ReadonlySet<string>,
  incoming:
    ReadonlyMap<
      string,
      ReadonlySet<string>
    >,
): "terminal-only" | "non-terminal" | "unresolved" {
  if (!region) return "unresolved";
  const synthetic: ScriptedRemovalEvidence = {
    scriptPath: path,
    executionRegion: region,
    actorIdentifier: "*",
    mechanism: "entity-remove",
  };
  return scriptedRemovalScope(
    synthetic,
    lifecycle,
    terminalRegions,
    incoming,
  );
}

function conditionalDespawnReachabilityForActor(
  actorIdentifier: string,
  entities:
    readonly ParsedEntityDefinition[],
  externalEvidence:
    readonly EntityEventExternalEvidence[],
  lifecycle:
    ArenaLifecycleAnalysis | undefined,
  terminalRegions:
    ReadonlySet<string>,
  incoming:
    ReadonlyMap<
      string,
      ReadonlySet<string>
    >,
): {
  readonly status:
    | "reachable"
    | "terminal-only"
    | "inactive"
    | "unresolved";
  readonly activationEvents:
    readonly string[];
} {
  const entity =
    entities.find(
      (item) =>
        item.identifier !== undefined &&
        normalizeActorIdentifier(
          item.identifier,
        ) === actorIdentifier,
    );
  if (!entity) {
    return {
      status: "unresolved",
      activationEvents: [],
    };
  }

  const activationEvents =
    conditionalDespawnEvents(entity);
  if (activationEvents.length === 0) {
    return {
      status: "inactive",
      activationEvents: [],
    };
  }

  const internal =
    analyzeEntityTransitionReachability(
      entity,
    );
  const internallyReachable =
    new Set([
      ...internal.reachableEvents,
      ...internal.externallyReachableEvents,
    ]);
  if (
    activationEvents.some((event) =>
      internallyReachable.has(event)
    )
  ) {
    return {
      status: "reachable",
      activationEvents,
    };
  }

  const exactEvidence =
    externalEvidence.filter(
      (item) =>
        eventEvidenceMatchesEntity(
          item,
          actorIdentifier,
        ) &&
        Object.hasOwn(
          entity.events,
          item.event,
        ),
    );
  const exactReachable =
    followEntityEvents(
      entity,
      exactEvidence.map(
        (item) => item.event,
      ),
    );
  const reachesDespawn =
    activationEvents.some((event) =>
      exactReachable.has(event)
    );

  if (reachesDespawn) {
    const relevantEvidence =
      exactEvidence.filter(
        (item) => {
          const reachable =
            followEntityEvents(
              entity,
              [item.event],
            );
          return activationEvents.some(
            (event) =>
              reachable.has(event),
          );
        },
      );
    const scopes =
      relevantEvidence.map((item) =>
        lifecycleScopeForRegion(
          item.source.relativePath,
          item.executionRegion,
          lifecycle,
          terminalRegions,
          incoming,
        )
      );
    if (
      scopes.length > 0 &&
      scopes.every(
        (scope) =>
          scope === "terminal-only",
      )
    ) {
      return {
        status: "terminal-only",
        activationEvents,
      };
    }
    if (
      scopes.some(
        (scope) =>
          scope === "non-terminal",
      )
    ) {
      return {
        status: "reachable",
        activationEvents,
      };
    }
    return {
      status: "unresolved",
      activationEvents,
    };
  }

  const broadEvidence =
    externalEvidence.filter(
      (item) =>
        item.entityIdentifier ===
          undefined &&
        Object.hasOwn(
          entity.events,
          item.event,
        ),
    );
  const broadReachable =
    followEntityEvents(
      entity,
      broadEvidence.map(
        (item) => item.event,
      ),
    );
  if (
    activationEvents.some((event) =>
      broadReachable.has(event)
    )
  ) {
    return {
      status: "unresolved",
      activationEvents,
    };
  }

  if (entity.runtimeIdentifier) {
    return {
      status: "unresolved",
      activationEvents,
    };
  }

  return {
    status: "inactive",
    activationEvents,
  };
}

function entityDespawnEvidence(
  entities:
    readonly ParsedEntityDefinition[],
): EntityDespawnEvidence[] {
  const output:
    EntityDespawnEvidence[] = [];

  for (const entity of entities) {
    if (!entity.identifier) continue;
    const actorIdentifier =
      normalizeActorIdentifier(
        entity.identifier,
      );

    if (
      entity.baseComponents.includes(
        "minecraft:instant_despawn",
      )
    ) {
      output.push({
        actorIdentifier,
        kind: "immediate",
        basis:
          "base:minecraft:instant_despawn",
      });
    } else if (
      entity.baseComponents.includes(
        "minecraft:despawn",
      )
    ) {
      output.push({
        actorIdentifier,
        kind: "conditional",
        basis:
          "base:minecraft:despawn",
      });
    }

    for (
      const [
        groupId,
        components,
      ] of Object.entries(
        entity.componentGroups,
      )
    ) {
      if (
        components.includes(
          "minecraft:instant_despawn",
        )
      ) {
        output.push({
          actorIdentifier,
          kind: "conditional",
          basis:
            "group:" +
            groupId +
            ":minecraft:instant_despawn",
        });
      } else if (
        components.includes(
          "minecraft:despawn",
        )
      ) {
        output.push({
          actorIdentifier,
          kind: "conditional",
          basis:
            "group:" +
            groupId +
            ":minecraft:despawn",
        });
      }
    }
  }

  return output.filter(
    (item, index, all) =>
      all.findIndex((candidate) =>
        candidate.actorIdentifier ===
          item.actorIdentifier &&
        candidate.kind === item.kind &&
        candidate.basis === item.basis
      ) === index,
  );
}

function actorIdsForGrowth(
  item: CounterEvidenceRecord,
  spawns: readonly SpawnEvidenceRecord[],
  graph:
    ReadonlyMap<
      string,
      ReadonlySet<string>
    >,
): string[] {
  if (item.operation !== "growth") {
    return [];
  }
  const growthNode =
    localNode(
      item.scriptPath,
      item.executionRegion,
    );
  return [
    ...new Set(
      spawns.flatMap((spawn) => {
        const spawnNode =
          localNode(
            spawn.scriptPath,
            spawn.executionRegion,
          );
        return (
          growthNode === spawnNode ||
          reaches(
            growthNode,
            spawnNode,
            graph,
          ) ||
          reaches(
            spawnNode,
            growthNode,
            graph,
          )
        )
          ? [spawn.actorIdentifier]
          : [];
      }),
    ),
  ].sort();
}

function actorIdsForDecrement(
  item: CounterEvidenceRecord,
  guards: readonly LifecycleActorGuard[],
  lifecycleReachable:
    ReadonlySet<string>,
  graph:
    ReadonlyMap<
      string,
      ReadonlySet<string>
    >,
): string[] {
  if (item.operation !== "decrement") {
    return [];
  }
  const decrementNode =
    localNode(
      item.scriptPath,
      item.executionRegion,
    );
  if (
    !lifecycleReachable.has(
      decrementNode,
    )
  ) {
    return [];
  }

  return [
    ...new Set(
      guards.flatMap((guard) => {
        const guardNode =
          localNode(
            guard.scriptPath,
            guard.executionRegion,
          );
        return (
          lifecycleReachable.has(
            guardNode,
          ) &&
          (
            guardNode === decrementNode ||
            reaches(
              guardNode,
              decrementNode,
              graph,
            )
          )
        )
          ? [guard.actorIdentifier]
          : [];
      }),
    ),
  ].sort();
}

function quantityForGrowth(
  item: CounterEvidenceRecord,
  spawns: readonly SpawnEvidenceRecord[],
): {
  readonly status:
    | "matched"
    | "mismatch"
    | "unresolved";
  readonly spawnCount?: number;
  readonly counterAmount?: number;
} {
  if (
    item.operation !== "growth" ||
    item.kind !== "variable" ||
    item.executionShape !== "single" ||
    item.amount === undefined ||
    !Number.isInteger(item.amount) ||
    item.amount <= 0
  ) {
    return { status: "unresolved" };
  }

  const directSpawns =
    spawns.filter((spawn) =>
      spawn.scriptPath ===
        item.scriptPath &&
      spawn.executionRegion ===
        item.executionRegion,
    );

  if (
    directSpawns.length === 0 ||
    directSpawns.some(
      (spawn) =>
        spawn.executionShape !==
        "single",
    )
  ) {
    return { status: "unresolved" };
  }

  const actorIds =
    new Set(
      directSpawns.map(
        (spawn) =>
          spawn.actorIdentifier,
      ),
    );
  if (actorIds.size !== 1) {
    return { status: "unresolved" };
  }

  const spawnCount =
    directSpawns.length;
  return {
    status:
      spawnCount === item.amount
        ? "matched"
        : "mismatch",
    spawnCount,
    counterAmount:
      item.amount,
  };
}

function counterKey(
  item: CounterEvidenceRecord,
): string {
  return (
    item.kind +
    ":" +
    item.counterId
  );
}

export function analyzeProgressionActorAccounting(
  inputs:
    readonly ProgressionActorAccountingInput[],
  crossFileCalls:
    readonly CrossFileCallEdge[] = [],
  entities:
    readonly ParsedEntityDefinition[] = [],
  arenaLifecycle?:
    ArenaLifecycleAnalysis,
  entityEventEvidence:
    readonly EntityEventExternalEvidence[] = [],
  activeEventEvidence:
    readonly ScriptProgressionActiveEventEvidence[] = [],
): ProgressionActorAccountingAnalysis {
  const scripts =
    inputs.map(normalizedInput);
  const evidence = scripts.flatMap(
    (script) => [
      ...variableEvidence(script),
      ...scoreboardEvidence(script),
    ],
  );
  const graph =
    callGraph(
      scripts,
      crossFileCalls,
    );
  const lifecycleRoots =
    lifecycleRootsByKind(scripts);
  const deathReachable =
    reachableFrom(
      lifecycleRoots.death,
      graph,
    );
  const removeReachable =
    reachableFrom(
      lifecycleRoots.remove,
      graph,
    );
  const lifecycleReachable =
    new Set([
      ...deathReachable,
      ...removeReachable,
    ]);
  const spawns =
    spawnEvidence(scripts);
  const guards =
    lifecycleActorGuards(scripts);
  const scriptedRemovals =
    scriptedRemovalEvidence(
      scripts,
      guards,
    );
  const terminalRegions =
    terminalReachableRegions(
      arenaLifecycle,
    );
  const incoming =
    incomingCallers(
      scripts,
      crossFileCalls,
    );
  const despawnEvidence =
    entityDespawnEvidence(entities);

  const grouped =
    new Map<
      string,
      CounterEvidenceRecord[]
    >();
  for (const item of evidence) {
    const key = counterKey(item);
    grouped.set(
      key,
      [
        ...(grouped.get(key) ?? []),
        item,
      ],
    );
  }

  const counters =
    [...grouped.values()]
      .map((items) => {
        const first = items[0]!;
        const growth = items.filter(
          (item) =>
            item.operation === "growth",
        );
        const decrements = items.filter(
          (item) =>
            item.operation ===
            "decrement",
        );
        const growthWrites =
          growth.length;
        const decrementWrites =
          decrements.length;
        const replacementWrites =
          items.filter(
            (item) =>
              item.operation ===
              "replacement",
          ).length;
        const completionChecks =
          items.filter(
            (item) =>
              item.operation ===
              "completion-check",
          ).length;
        const linkedDecrements =
          decrements.filter(
            (item) =>
              lifecycleReachable.has(
                localNode(
                  item.scriptPath,
                  item.executionRegion,
                ),
              ),
          ).length;
        const deathLinkedDecrements =
          decrements.filter(
            (item) =>
              deathReachable.has(
                localNode(
                  item.scriptPath,
                  item.executionRegion,
                ),
              ),
          ).length;
        const removeLinkedDecrements =
          decrements.filter(
            (item) =>
              removeReachable.has(
                localNode(
                  item.scriptPath,
                  item.executionRegion,
                ),
              ),
          ).length;
        const reconciliationLifecycleKinds = [
          ...(deathLinkedDecrements > 0
            ? ["death" as const]
            : []),
          ...(removeLinkedDecrements > 0
            ? ["remove" as const]
            : []),
        ];
        const actorAccountingCandidate =
          ACTOR_COUNTER_NAME.test(
            first.counterId,
          );
        const quantityResults =
          growth.map((item) =>
            quantityForGrowth(
              item,
              spawns,
            )
          );
        const quantityComparableGrowths =
          quantityResults.filter(
            (item) =>
              item.status === "matched" ||
              item.status === "mismatch",
          ).length;
        const quantityMatchedGrowths =
          quantityResults.filter(
            (item) =>
              item.status === "matched",
          ).length;
        const quantityMismatchGrowths =
          quantityResults.filter(
            (item) =>
              item.status === "mismatch",
          ).length;

        const spawnLinkedActorIdentifiers =
          [
            ...new Set(
              growth.flatMap((item) =>
                actorIdsForGrowth(
                  item,
                  spawns,
                  graph,
                )
              ),
            ),
          ].sort();
        const deathLifecycleActorIdentifiers =
          [
            ...new Set(
              decrements.flatMap((item) =>
                actorIdsForDecrement(
                  item,
                  guards,
                  deathReachable,
                  graph,
                )
              ),
            ),
          ].sort();
        const removeLifecycleActorIdentifiers =
          [
            ...new Set(
              decrements.flatMap((item) =>
                actorIdsForDecrement(
                  item,
                  guards,
                  removeReachable,
                  graph,
                )
              ),
            ),
          ].sort();
        const lifecycleActorIdentifiers =
          [
            ...new Set([
              ...deathLifecycleActorIdentifiers,
              ...removeLifecycleActorIdentifiers,
            ]),
          ].sort();
        const lifecycleSet =
          new Set(
            lifecycleActorIdentifiers,
          );
        const matchedActorIdentifiers =
          spawnLinkedActorIdentifiers
            .filter((id) =>
              lifecycleSet.has(id)
            )
            .sort();
        const spawnActorSet =
          new Set(
            spawnLinkedActorIdentifiers,
          );
        const relevantScriptedRemovals =
          scriptedRemovals
            .filter((item) =>
              spawnActorSet.has(
                item.actorIdentifier,
              )
            );
        const scriptedRemovalActorIdentifiers =
          [
            ...new Set(
              relevantScriptedRemovals
                .map((item) =>
                  item.actorIdentifier
                ),
            ),
          ].sort();
        const terminalOnlyScriptedRemovalActorIdentifiers =
          [
            ...new Set(
              relevantScriptedRemovals
                .filter((item) =>
                  scriptedRemovalScope(
                    item,
                    arenaLifecycle,
                    terminalRegions,
                    incoming,
                  ) ===
                    "terminal-only",
                )
                .map((item) =>
                  item.actorIdentifier
                ),
            ),
          ].sort();
        const nonTerminalScriptedRemovalActorIdentifiers =
          [
            ...new Set(
              relevantScriptedRemovals
                .filter((item) =>
                  scriptedRemovalScope(
                    item,
                    arenaLifecycle,
                    terminalRegions,
                    incoming,
                  ) ===
                    "non-terminal",
                )
                .map((item) =>
                  item.actorIdentifier
                ),
            ),
          ].sort();
        const unresolvedScriptedRemovalActorIdentifiers =
          [
            ...new Set(
              relevantScriptedRemovals
                .filter((item) =>
                  scriptedRemovalScope(
                    item,
                    arenaLifecycle,
                    terminalRegions,
                    incoming,
                  ) ===
                    "unresolved",
                )
                .map((item) =>
                  item.actorIdentifier
                ),
            ),
          ].sort();
        const scriptedRemovalScopeStatus =
          nonTerminalScriptedRemovalActorIdentifiers
              .length > 0
            ? "non-terminal" as const
            : unresolvedScriptedRemovalActorIdentifiers
                  .length > 0
              ? "unresolved" as const
              : terminalOnlyScriptedRemovalActorIdentifiers
                    .length > 0
                ? "terminal-only" as const
                : "none" as const;
        const removeLifecycleSet =
          new Set(
            removeLifecycleActorIdentifiers,
          );
        const riskyRemovalActorSet =
          new Set([
            ...nonTerminalScriptedRemovalActorIdentifiers,
            ...unresolvedScriptedRemovalActorIdentifiers,
          ]);
        const uncoveredScriptedRemovalActorIdentifiers =
          scriptedRemovalActorIdentifiers
            .filter((actorIdentifier) => {
              if (
                !riskyRemovalActorSet.has(
                  actorIdentifier,
                ) ||
                removeLifecycleSet.has(
                  actorIdentifier,
                )
              ) {
                return false;
              }
              return scriptedRemovals
                .filter((item) =>
                  item.actorIdentifier ===
                    actorIdentifier,
                )
                .every((item) =>
                  !directRemovalCanReachDecrement(
                    item,
                    decrements,
                    graph,
                  ),
                );
            })
            .sort();
        const scriptedRemovalCoverage =
          scriptedRemovalActorIdentifiers
              .length === 0
            ? "none" as const
            : uncoveredScriptedRemovalActorIdentifiers
                .length > 0
              ? "uncovered" as const
              : removeLifecycleActorIdentifiers
                    .length > 0 ||
                  scriptedRemovals.some(
                    (item) =>
                      scriptedRemovalActorIdentifiers
                        .includes(
                          item.actorIdentifier,
                        ) &&
                      directRemovalCanReachDecrement(
                        item,
                        decrements,
                        graph,
                      ),
                  )
                ? "covered" as const
                : "unresolved" as const;
        const spawnActorSetForDespawn =
          new Set(
            spawnLinkedActorIdentifiers,
          );
        const immediateDespawnActorIdentifiers =
          [
            ...new Set(
              despawnEvidence
                .filter((item) =>
                  item.kind ===
                    "immediate" &&
                  spawnActorSetForDespawn.has(
                    item.actorIdentifier,
                  )
                )
                .map((item) =>
                  item.actorIdentifier
                ),
            ),
          ].sort();
        const conditionalDespawnActorIdentifiers =
          [
            ...new Set(
              despawnEvidence
                .filter((item) =>
                  item.kind ===
                    "conditional" &&
                  spawnActorSetForDespawn.has(
                    item.actorIdentifier,
                  )
                )
                .map((item) =>
                  item.actorIdentifier
                ),
            ),
          ].sort();
        const conditionalReachability =
          new Map(
            conditionalDespawnActorIdentifiers.map(
              (actorIdentifier) => [
                actorIdentifier,
                conditionalDespawnReachabilityForActor(
                  actorIdentifier,
                  entities,
                  entityEventEvidence,
                  arenaLifecycle,
                  terminalRegions,
                  incoming,
                ),
              ],
            ),
          );
        const reachableConditionalDespawnActorIdentifiers =
          conditionalDespawnActorIdentifiers
            .filter((id) =>
              conditionalReachability
                .get(id)?.status ===
                "reachable",
            );
        const terminalOnlyConditionalDespawnActorIdentifiers =
          conditionalDespawnActorIdentifiers
            .filter((id) =>
              conditionalReachability
                .get(id)?.status ===
                "terminal-only",
            );
        const inactiveConditionalDespawnActorIdentifiers =
          conditionalDespawnActorIdentifiers
            .filter((id) =>
              conditionalReachability
                .get(id)?.status ===
                "inactive",
            );
        const activeInstantDespawnActorIdentifiers =
          conditionalDespawnActorIdentifiers
            .filter((actorIdentifier) => {
              const entity =
                entities.find(
                  (item) =>
                    item.identifier !== undefined &&
                    normalizeActorIdentifier(
                      item.identifier,
                    ) === actorIdentifier,
                );
              if (!entity) return false;
              const kinds =
                conditionalDespawnEventKinds(
                  entity,
                );
              const exactExternal =
                entityEventEvidence.filter(
                  (item) =>
                    eventEvidenceMatchesEntity(
                      item,
                      actorIdentifier,
                    )
                );
              return exactExternal.some(
                (item) =>
                  (
                    kinds.get(item.event) ===
                      "instant" ||
                    kinds.get(item.event) ===
                      "mixed"
                  ) &&
                  activeEventEvidence.some(
                    (active) =>
                      active.event ===
                        item.event &&
                      active.source
                        .relativePath ===
                        item.source
                          .relativePath &&
                      active.executionRegion ===
                        item.executionRegion,
                  ),
              );
            })
            .sort();
        const uncoveredImmediateDespawnActorIdentifiers =
          immediateDespawnActorIdentifiers
            .filter((id) =>
              !removeLifecycleSet.has(id)
            )
            .sort();
        const unresolvedConditionalDespawnActorIdentifiers =
          conditionalDespawnActorIdentifiers
            .filter((id) =>
              !removeLifecycleSet.has(id) &&
              (
                conditionalReachability
                  .get(id)?.status ===
                  "reachable" ||
                conditionalReachability
                  .get(id)?.status ===
                  "unresolved"
              )
            )
            .sort();
        const uncoveredActiveInstantDespawnActorIdentifiers =
          activeInstantDespawnActorIdentifiers
            .filter((id) =>
              !removeLifecycleSet.has(id)
            )
            .sort();

        const missingReconciliation =
          actorAccountingCandidate &&
          growthWrites > 0 &&
          completionChecks > 0 &&
          decrementWrites === 0 &&
          replacementWrites === 0;

        const identityComparable =
          actorAccountingCandidate &&
          growthWrites > 0 &&
          completionChecks > 0 &&
          spawnLinkedActorIdentifiers
            .length > 0 &&
          lifecycleActorIdentifiers
            .length > 0;
        const identityMismatch =
          identityComparable &&
          matchedActorIdentifiers.length ===
            0 &&
          replacementWrites === 0;
        const matched =
          identityComparable &&
          matchedActorIdentifiers.length > 0 &&
          linkedDecrements > 0;

        const actorIdentityStatus =
          !actorAccountingCandidate
            ? "not-applicable" as const
            : matched
              ? "matched" as const
              : identityMismatch
                ? "mismatch" as const
                : "unresolved" as const;
        const spawnQuantityStatus =
          !actorAccountingCandidate
            ? "not-applicable" as const
            : quantityMismatchGrowths > 0
              ? "mismatch" as const
              : quantityComparableGrowths > 0 &&
                  quantityMatchedGrowths ===
                    quantityComparableGrowths
                ? "matched" as const
                : "unresolved" as const;
        const quantityMismatch =
          actorAccountingCandidate &&
          growthWrites > 0 &&
          completionChecks > 0 &&
          quantityMismatchGrowths > 0 &&
          replacementWrites === 0;
        const immediateDespawnWithoutReconciliation =
          actorAccountingCandidate &&
          growthWrites > 0 &&
          completionChecks > 0 &&
          uncoveredImmediateDespawnActorIdentifiers
            .length > 0 &&
          replacementWrites === 0;
        const activeInstantDespawnWithoutReconciliation =
          actorAccountingCandidate &&
          growthWrites > 0 &&
          completionChecks > 0 &&
          uncoveredActiveInstantDespawnActorIdentifiers
            .length > 0 &&
          replacementWrites === 0;

        return {
          scriptId: [
            ...new Set(
              items.map(
                (item) => item.scriptId,
              ),
            ),
          ].sort().join(","),
          counterId:
            first.counterId,
          kind: first.kind,
          growthWrites,
          decrementWrites,
          replacementWrites,
          completionChecks,
          lifecycleLinkedDecrements:
            linkedDecrements,
          deathLinkedDecrements,
          removeLinkedDecrements,
          reconciliationLifecycleKinds,
          deathLifecycleActorIdentifiers,
          removeLifecycleActorIdentifiers,
          scriptedRemovalActorIdentifiers,
          terminalOnlyScriptedRemovalActorIdentifiers,
          nonTerminalScriptedRemovalActorIdentifiers,
          unresolvedScriptedRemovalActorIdentifiers,
          scriptedRemovalScope:
            scriptedRemovalScopeStatus,
          uncoveredScriptedRemovalActorIdentifiers,
          scriptedRemovalCoverage,
          immediateDespawnActorIdentifiers,
          conditionalDespawnActorIdentifiers,
          reachableConditionalDespawnActorIdentifiers,
          terminalOnlyConditionalDespawnActorIdentifiers,
          inactiveConditionalDespawnActorIdentifiers,
          activeInstantDespawnActorIdentifiers,
          uncoveredActiveInstantDespawnActorIdentifiers,
          uncoveredImmediateDespawnActorIdentifiers,
          unresolvedConditionalDespawnActorIdentifiers,
          quantityComparableGrowths,
          quantityMatchedGrowths,
          quantityMismatchGrowths,
          spawnQuantityStatus,
          actorAccountingCandidate,
          spawnLinkedActorIdentifiers,
          lifecycleActorIdentifiers,
          matchedActorIdentifiers,
          actorIdentityStatus,
          status:
            missingReconciliation
              ? "missing-reconciliation" as const
              : identityMismatch
                ? "actor-identity-mismatch" as const
                : quantityMismatch
                  ? "spawn-quantity-mismatch" as const
                  : activeInstantDespawnWithoutReconciliation
                    ? "active-instant-despawn-without-reconciliation" as const
                    : immediateDespawnWithoutReconciliation
                      ? "instant-despawn-without-reconciliation" as const
                      : matched &&
                      spawnQuantityStatus ===
                        "matched"
                    ? "reconciled-from-matched-actor-lifecycle" as const
                    : "unresolved" as const,
          reasons:
            missingReconciliation
              ? [
                  "An actor-accounting counter grows and gates completion at zero, but the selected artifact exposes no decrement or replacement/recompute path.",
                ]
              : identityMismatch
                ? [
                    "Counter growth is source-linked to actor type(s) " +
                    spawnLinkedActorIdentifiers.join(", ") +
                    ", while lifecycle-linked decrement is guarded for different actor type(s) " +
                    lifecycleActorIdentifiers.join(", ") +
                    ". No matching actor identity can reconcile the growth path.",
                  ]
                : quantityMismatch
                  ? [
                      "A single-invocation actor spawn region has a deterministic literal spawn count that does not match the actor-counter growth amount. The counter can diverge from the population it claims to represent.",
                    ]
                  : activeInstantDespawnWithoutReconciliation
                    ? [
                        "A counted actor has an exact event-driven minecraft:instant_despawn activation under a source-proven active gameplay state guard, but no matching entity-remove reconciliation path reaches the counter.",
                      ]
                    : immediateDespawnWithoutReconciliation
                      ? [
                          "A counted actor definition includes base minecraft:instant_despawn, but no matching entity-remove reconciliation path reaches the actor counter. The actor can disappear immediately while the completion gate still depends on the counter.",
                        ]
                      : matched &&
                      spawnQuantityStatus ===
                        "matched"
                    ? [
                        "Counter growth is source-linked to actor type(s) " +
                        matchedActorIdentifiers.join(", ") +
                        ", actor quantity matches the direct spawn count, and matching actor reconciliation reaches the decrement through lifecycle kind(s): " +
                        reconciliationLifecycleKinds.join(", ") +
                        ".",
                      ]
                    : [
                      linkedDecrements > 0
                        ? "A lifecycle-linked decrement exists, but the selected artifact does not yet prove that it reconciles the same actor identity that caused the counter growth."
                        : decrementWrites > 0
                          ? "A decrement exists, but no selected-artifact entity-death/entity-remove call path proves that the actor lifecycle can reach it."
                          : replacementWrites > 0
                            ? "Replacement/set writes exist, but their role may be initialization, reset, or recomputation. They are not credited as actor reconciliation without lifecycle proof."
                            : "Only part of the actor-counter lifecycle is grounded. Do not classify it safe or defective until producer, completion, and reconciliation ownership are complete.",
                    ],
        };
      })
      .filter((item) =>
        item.growthWrites > 0 ||
        item.decrementWrites > 0 ||
        item.replacementWrites > 0 ||
        item.completionChecks > 0
      )
      .sort((a, b) =>
        a.counterId.localeCompare(
          b.counterId,
        ) ||
        a.kind.localeCompare(b.kind)
      );

  return {
    counters,
    provenMissingReconciliation:
      counters.filter(
        (item) =>
          item.status ===
          "missing-reconciliation",
      ).length,
    provenActorIdentityMismatch:
      counters.filter(
        (item) =>
          item.status ===
          "actor-identity-mismatch",
      ).length,
    provenSpawnQuantityMismatch:
      counters.filter(
        (item) =>
          item.status ===
          "spawn-quantity-mismatch",
      ).length,
    scriptedRemovalCoverageGaps:
      counters.filter(
        (item) =>
          item.scriptedRemovalCoverage ===
          "uncovered",
      ).length,
    terminalOnlyScriptedRemovalCounters:
      counters.filter(
        (item) =>
          item.scriptedRemovalScope ===
          "terminal-only",
      ).length,
    nonTerminalScriptedRemovalCounters:
      counters.filter(
        (item) =>
          item.scriptedRemovalScope ===
          "non-terminal",
      ).length,
    provenImmediateDespawnWithoutReconciliation:
      counters.filter(
        (item) =>
          item.status ===
          "instant-despawn-without-reconciliation",
      ).length,
    conditionalDespawnUnknowns:
      counters.filter(
        (item) =>
          item.unresolvedConditionalDespawnActorIdentifiers
            .length > 0,
      ).length,
    reachableConditionalDespawnCounters:
      counters.filter(
        (item) =>
          item.reachableConditionalDespawnActorIdentifiers
            .length > 0,
      ).length,
    terminalOnlyConditionalDespawnCounters:
      counters.filter(
        (item) =>
          item.terminalOnlyConditionalDespawnActorIdentifiers
            .length > 0,
      ).length,
    inactiveConditionalDespawnCounters:
      counters.filter(
        (item) =>
          item.inactiveConditionalDespawnActorIdentifiers
            .length > 0,
      ).length,
    provenActiveInstantDespawnWithoutReconciliation:
      counters.filter(
        (item) =>
          item.status ===
          "active-instant-despawn-without-reconciliation",
      ).length,
    reconciledFromMatchedActorLifecycle:
      counters.filter(
        (item) =>
          item.status ===
          "reconciled-from-matched-actor-lifecycle",
      ).length,
    unresolvedCounters:
      counters.filter(
        (item) =>
          item.status === "unresolved",
      ).length,
  };
}
