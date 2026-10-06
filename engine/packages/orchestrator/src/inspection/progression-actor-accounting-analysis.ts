import type {
  CrossFileCallEdge,
  ParsedScriptFile,
  ScriptProgressionCounterEvidence,
} from "../../../../analyzers/scripts/src/index.js";

export type ProgressionCounterKind =
  | "variable"
  | "scoreboard";

export type ProgressionCounterStatus =
  | "reconciled-from-actor-lifecycle"
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
  readonly status: ProgressionCounterStatus;
  readonly reasons: readonly string[];
}

export interface ProgressionActorAccountingAnalysis {
  readonly counters:
    readonly ProgressionCounterAssessment[];
  readonly provenMissingReconciliation: number;
  readonly reconciledFromActorLifecycle: number;
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
  const lifecycleReachable =
    reachableFrom(
      lifecycleRoots(scripts),
      callGraph(
        scripts,
        crossFileCalls,
      ),
    );

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
        const growthWrites =
          items.filter(
            (item) =>
              item.operation === "growth",
          ).length;
        const decrementWrites =
          items.filter(
            (item) =>
              item.operation ===
              "decrement",
          ).length;
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
          items.filter(
            (item) =>
              item.operation ===
                "decrement" &&
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

        const missingReconciliation =
          actorAccountingCandidate &&
          growthWrites > 0 &&
          completionChecks > 0 &&
          decrementWrites === 0 &&
          replacementWrites === 0;
        const reconciled =
          actorAccountingCandidate &&
          growthWrites > 0 &&
          completionChecks > 0 &&
          linkedDecrements > 0;

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
          status:
            missingReconciliation
              ? "missing-reconciliation" as const
              : reconciled
                ? "reconciled-from-actor-lifecycle" as const
                : "unresolved" as const,
          reasons:
            missingReconciliation
              ? [
                  "An actor-accounting counter grows and gates completion at zero, but the selected artifact exposes no decrement or replacement/recompute path.",
                ]
              : reconciled
                ? [
                    "At least one decrement is statically reachable from an entity-death or entity-remove lifecycle root, so actor reconciliation is source-linked rather than merely present somewhere in the project.",
                  ]
                : [
                    decrementWrites > 0
                      ? "A decrement exists, but no selected-artifact entity-death/entity-remove call path proves that the actor lifecycle can reach it. Keep this gray-zone until lifecycle ownership is linked."
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
    reconciledFromActorLifecycle:
      counters.filter(
        (item) =>
          item.status ===
          "reconciled-from-actor-lifecycle",
      ).length,
    unresolvedCounters:
      counters.filter(
        (item) =>
          item.status === "unresolved",
      ).length,
  };
}
