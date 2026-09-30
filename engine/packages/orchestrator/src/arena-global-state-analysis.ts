import type {
  ParsedFunction,
} from "../../../analyzers/functions/src/index.js";
import type {
  ParsedScriptFile,
  ScriptGlobalLeaseEvidence,
} from "../../../analyzers/scripts/src/index.js";
import type {
  SourceRef,
} from "../../project-model/src/index.js";

export type ArenaGlobalStateLeaseStatus =
  | "paired-lease-evidence"
  | "partial-lease-evidence"
  | "unleased"
  | "unscoped";

export interface ArenaGlobalStateMutation {
  id: string;
  ownerKind: "script" | "function";
  ownerId: string;
  executionRegion?: string;
  resource: string;
  command: string;
  arenaScoped: boolean;
  source: SourceRef;
}

export interface ArenaGlobalStateLeaseAssessment {
  mutationId: string;
  resource: string;
  status: ArenaGlobalStateLeaseStatus;
  acquireEvidence: number;
  releaseEvidence: number;
  restoreEvidence: number;
  auditEvidence: number;
  audited: boolean;
  reasons: readonly string[];
}

export interface ArenaGlobalStateAnalysis {
  mutations: readonly ArenaGlobalStateMutation[];
  assessments: readonly ArenaGlobalStateLeaseAssessment[];
  arenaScopedMutations: number;
  pairedLeaseEvidence: number;
  partialLeaseEvidence: number;
  unleasedArenaMutations: number;
  unscopedMutations: number;
  unauditedArenaMutations: number;
}

function graphFor(
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

function normalizedCommand(
  command: string,
): string[] {
  return command
    .trim()
    .replace(/^\//, "")
    .split(/\s+/)
    .filter(Boolean);
}

function globalResource(
  command: string,
): string | undefined {
  const tokens = normalizedCommand(command);
  const head = tokens[0]?.toLowerCase();
  if (!head) return undefined;

  if (head === "gamerule" && tokens[1]) {
    return (
      "gamerule:" +
      tokens[1].toLowerCase()
    );
  }
  if (head === "difficulty") {
    return "difficulty";
  }
  if (
    head === "time" &&
    tokens[1]?.toLowerCase() !== "query"
  ) {
    return "time";
  }
  if (
    head === "weather" ||
    head === "toggledownfall"
  ) {
    return "weather";
  }
  if (head === "daylock") {
    return "daylock";
  }
  if (head === "setworldspawn") {
    return "worldspawn";
  }
  return undefined;
}

function leaseMatches(
  resource: string,
  lease: ScriptGlobalLeaseEvidence,
): boolean {
  if (!lease.resource) return false;
  const normalized =
    lease.resource.toLowerCase();
  if (normalized === resource) return true;
  if (
    resource.startsWith("gamerule:") &&
    normalized ===
      resource.slice("gamerule:".length)
  ) {
    return true;
  }
  return false;
}

function mutationId(
  ownerKind: "script" | "function",
  ownerId: string,
  source: SourceRef,
  resource: string,
): string {
  return [
    "global-state",
    ownerKind,
    ownerId,
    resource,
    source.range?.lineStart ?? 0,
  ].join(":");
}

function scriptMutations(
  script: ParsedScriptFile,
): ArenaGlobalStateMutation[] {
  const regions = arenaRegions(script);
  return script.commandLiterals.flatMap(
    (literal) => {
      const resource =
        globalResource(literal.command);
      if (!resource) return [];
      const region =
        literal.executionRegion ??
        "module";
      return [{
        id: mutationId(
          "script",
          script.identifier,
          literal.source,
          resource,
        ),
        ownerKind: "script" as const,
        ownerId: script.identifier,
        executionRegion: region,
        resource,
        command: literal.command,
        arenaScoped: regions.has(region),
        source: literal.source,
      }];
    },
  );
}

function functionMutations(
  fn: ParsedFunction,
): ArenaGlobalStateMutation[] {
  return fn.commands.flatMap((command) => {
    const resource =
      globalResource(command.raw);
    if (!resource) return [];
    return [{
      id: mutationId(
        "function",
        fn.identifier,
        command.source,
        resource,
      ),
      ownerKind: "function" as const,
      ownerId: fn.identifier,
      resource,
      command: command.raw,
      arenaScoped: false,
      source: command.source,
    }];
  });
}

function assess(
  mutation: ArenaGlobalStateMutation,
  scriptsById: ReadonlyMap<
    string,
    ParsedScriptFile
  >,
): ArenaGlobalStateLeaseAssessment {
  if (!mutation.arenaScoped) {
    return {
      mutationId: mutation.id,
      resource: mutation.resource,
      status: "unscoped",
      acquireEvidence: 0,
      releaseEvidence: 0,
      restoreEvidence: 0,
      auditEvidence: 0,
      audited: false,
      reasons: [
        "World-global mutation is present, but static analysis has not proven that this source executes as part of an arena-owned path.",
      ],
    };
  }

  const script =
    scriptsById.get(mutation.ownerId);
  const evidence =
    (script?.globalLeaseEvidence ?? [])
      .filter((item) =>
        leaseMatches(
          mutation.resource,
          item,
        )
      );
  const acquire = evidence.filter(
    (item) => item.operation === "acquire",
  ).length;
  const release = evidence.filter(
    (item) => item.operation === "release",
  ).length;
  const restore = evidence.filter(
    (item) => item.operation === "restore",
  ).length;
  const audit = evidence.filter(
    (item) => item.operation === "audit",
  ).length;

  const paired =
    acquire > 0 &&
    (release > 0 || restore > 0);
  const partial =
    !paired &&
    evidence.length > 0;

  return {
    mutationId: mutation.id,
    resource: mutation.resource,
    status:
      paired
        ? "paired-lease-evidence"
        : partial
          ? "partial-lease-evidence"
          : "unleased",
    acquireEvidence: acquire,
    releaseEvidence: release,
    restoreEvidence: restore,
    auditEvidence: audit,
    audited: audit > 0,
    reasons:
      paired
        ? [
            "Static source contains matching acquire and release/restore lease evidence for this world-global resource.",
            ...(audit > 0
              ? [
                  "Global mutation audit evidence is also present.",
                ]
              : [
                  "No explicit global mutation audit helper was detected.",
                ]),
            "This is static ownership evidence only; runtime conflict arbitration and compare-and-swap behavior remain to be validated.",
          ]
        : partial
          ? [
              "Some lease-related source evidence exists, but a complete acquire plus release/restore pair was not found.",
            ]
          : [
              "Arena-scoped world-global mutation has no matching lease helper evidence.",
            ],
  };
}

export function analyzeArenaGlobalState(
  functions: readonly ParsedFunction[],
  scripts: readonly ParsedScriptFile[],
): ArenaGlobalStateAnalysis {
  const mutations = [
    ...functions.flatMap(
      functionMutations,
    ),
    ...scripts.flatMap(
      scriptMutations,
    ),
  ].sort((a, b) =>
    a.source.relativePath.localeCompare(
      b.source.relativePath,
    ) ||
    (a.source.range?.lineStart ?? 0) -
      (b.source.range?.lineStart ?? 0)
  );

  const scriptsById = new Map(
    scripts.map((script) => [
      script.identifier,
      script,
    ]),
  );
  const assessments = mutations.map(
    (mutation) =>
      assess(
        mutation,
        scriptsById,
      ),
  );

  return {
    mutations,
    assessments,
    arenaScopedMutations:
      mutations.filter(
        (item) => item.arenaScoped,
      ).length,
    pairedLeaseEvidence:
      assessments.filter(
        (item) =>
          item.status ===
          "paired-lease-evidence",
      ).length,
    partialLeaseEvidence:
      assessments.filter(
        (item) =>
          item.status ===
          "partial-lease-evidence",
      ).length,
    unleasedArenaMutations:
      assessments.filter(
        (item) =>
          item.status === "unleased",
      ).length,
    unscopedMutations:
      assessments.filter(
        (item) =>
          item.status === "unscoped",
      ).length,
    unauditedArenaMutations:
      assessments.filter(
        (item) =>
          item.status !== "unscoped" &&
          !item.audited,
      ).length,
  };
}
