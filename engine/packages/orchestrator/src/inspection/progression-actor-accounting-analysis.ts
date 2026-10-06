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
  | "spawn-quantity-mismatch"
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
