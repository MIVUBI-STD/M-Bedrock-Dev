import type {
  CrossFileCallEdge,
  ParsedScriptFile,
  ScriptProgressionCounterEvidence,
} from "../../../../analyzers/scripts/src/index.js";

export type ProgressionCounterKind =
  | "variable"
  | "scoreboard";

export type ProgressionCounterStatus =
  | "reconciled-from-matched-actor-lifecycle"
  | "actor-identity-mismatch"
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
}

interface SpawnEvidenceRecord {
  readonly scriptPath: string;
  readonly executionRegion: string;
  readonly actorIdentifier: string;
}

interface LifecycleActorGuard {
  readonly scriptPath: string;
  readonly executionRegion: string;
  readonly actorIdentifier: string;
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
          });
        }
      }
    }

    const completion =
      /(?:if|unless)\s+score\s+\S+\s+([A-Za-z0-9_.:-]+)\s+matches\s+(?:\.\.)?0(?:\b|\.\.)/i.exec(
        text,
      );
    if (
      completion &&
      SCOREBOARD_COUNTER_NAME.test(
        completion[1]!,
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

function lifecycleRoots(
  scripts: readonly NormalizedScript[],
): Set<string> {
  const roots = new Set<string>();
  for (const script of scripts) {
    for (
      const evidence of
        script.parsed
          .combatLifecycleEvidence ?? []
    ) {
      if (
        evidence.kind ===
        "death-subscription"
      ) {
        roots.add(
          localNode(
            script.parsed.source.relativePath,
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
        roots.add(
          localNode(
            script.parsed.source.relativePath,
            evidence.executionRegion,
          ),
        );
      }
    }
  }
  return roots;
}

function spawnEvidence(
  scripts: readonly NormalizedScript[],
): SpawnEvidenceRecord[] {
  const output: SpawnEvidenceRecord[] = [];

  for (const script of scripts) {
    const path =
      script.parsed.source.relativePath;

    for (
      const call of
        script.parsed.methodCalls
    ) {
      if (
        call.method !== "spawnEntity" ||
        call.executionRegion === undefined
      ) {
        continue;
      }
      const raw =
        call.argumentTexts?.[0];
      if (!raw) continue;
      const actorIdentifier =
        normalizeActorIdentifier(raw);
      if (
        !/^[a-z0-9_.-]+:[a-z0-9_./-]+$/i.test(
          actorIdentifier,
        )
      ) {
        continue;
      }
      output.push({
        scriptPath: path,
        executionRegion:
          call.executionRegion,
        actorIdentifier,
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
          item.actorIdentifier
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
  const lifecycleReachable =
    reachableFrom(
      lifecycleRoots(scripts),
      graph,
    );
  const spawns =
    spawnEvidence(scripts);
  const guards =
    lifecycleActorGuards(scripts);

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
        const actorAccountingCandidate =
          ACTOR_COUNTER_NAME.test(
            first.counterId,
          );

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
        const lifecycleActorIdentifiers =
          [
            ...new Set(
              decrements.flatMap((item) =>
                actorIdsForDecrement(
                  item,
                  guards,
                  lifecycleReachable,
                  graph,
                )
              ),
            ),
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
                : matched
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
                : matched
                  ? [
                      "Counter growth is source-linked to actor type(s) " +
                      matchedActorIdentifiers.join(", ") +
                      ", and an entity-death/entity-remove path guarded for the same actor identity reaches the decrement.",
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
