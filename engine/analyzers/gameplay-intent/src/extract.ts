import type {
  ParsedScriptFile,
  CrossFileCallEdge,
} from "../../scripts/src/index.js";
import type {
  GameplayIntentNodeKind,
} from "../../../packages/gameplay-intent/src/index.js";
import type {
  GameplayIntentRelationSignal,
  GameplayIntentSignal,
  GameplayIntentSignalSet,
} from "./types.js";

const KIND_TERMS: ReadonlyArray<{
  kind: GameplayIntentNodeKind;
  terms: readonly string[];
}> = [
  {
    kind: "role",
    terms: [
      "team", "teams", "spectator", "spectating",
    ],
  },
  {
    kind: "phase",
    terms: [
      "lobby", "queue", "countdown", "prepare", "preparing",
      "observation", "observe", "building", "active", "phase", "stage",
      "round", "transition", "finishing", "finish", "cinematic",
      "staging", "combat", "fortify", "laststand",
    ],
  },
  {
    kind: "lifecycle",
    terms: [
      "reset", "cleanup", "cleaning", "reconnect", "disconnect",
      "recovery", "recover", "respawn", "admission", "membership",
      "session", "rollback", "restore", "release", "join", "leave",
    ],
  },
  {
    kind: "resource",
    terms: [
      "score", "scoring", "coin", "currency", "resource", "resources", "ledger",
      "inventory", "palette", "health", "points", "kit", "scoreboard",
      "tick", "ticks", "time", "timer", "timers", "seconds",
      "capacity", "capacities", "concurrent", "concurrency", "limit", "limits",
      "maximum", "minimum", "max", "min", "slot", "slots", "quota",
      "players", "party", "parties",
      "armor", "armors", "sword", "wool", "iron", "gold",
      "diamond", "emerald",
    ],
  },
  {
    kind: "spatial-region",
    terms: [
      "arena", "plot", "geometry", "zone", "region", "cell",
      "bridge", "spawn", "lobby", "path", "route",
    ],
  },
  {
    kind: "objective",
    terms: [
      "objective", "flag", "capture", "target", "goal", "win",
      "winner", "victory", "defeat", "similarity",
      "bed", "beds", "eliminate", "eliminated", "elimination",
    ],
  },
  {
    kind: "policy",
    terms: [
      "policy", "permission", "permissions", "rule", "rules",
      "restriction", "guard", "admission", "queue", "queued",
      "throttle", "throttling",
    ],
  },
  {
    kind: "mechanic",
    terms: [
      "interaction", "placement", "water", "craft", "shop",
      "revive", "upgrade", "similarity", "clone", "feedback",
      "hologram", "combat", "hud", "schematic", "wave",
      "knockdown", "reviver", "reviving", "effect", "effects",
      "generator", "generators", "forge", "parkour", "selector",
    ],
  },
];

function normalize(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function slug(value: string): string {
  return normalize(value).replace(/\s+/g, "-");
}

const HELPER_VERBS = new Set([
  "show",
  "hide",
  "cancel",
  "add",
  "prepare",
  "skip",
  "process",
  "complete",
  "update",
  "teleport",
  "stop",
  "start",
  "spawn",
  "refresh",
  "finish",
  "check",
  "auto",
  "setup",
  "clear",
  "bootstrap",
  "apply",
  "build",
  "calculate",
  "create",
  "finalize",
  "format",
  "get",
  "initialize",
  "is",
  "make",
  "mark",
  "normalize",
  "record",
  "resolve",
  "select",
  "should",
  "translate",
]);

function classify(value: string): GameplayIntentNodeKind | undefined {
  const wordList =
    normalize(value).split(/\s+/).filter(Boolean);

  if (
    wordList.length === 1 &&
    ["phase", "stage", "state", "status"].includes(
      wordList[0]!,
    )
  ) {
    return "state";
  }

  const words = new Set(wordList);
  const matches = new Set<GameplayIntentNodeKind>();

  for (const entry of KIND_TERMS) {
    if (entry.terms.some((term) => words.has(term))) {
      matches.add(entry.kind);
    }
  }

  if (matches.size === 0) return undefined;

  if (
    words.has("generator") ||
    words.has("generators") ||
    words.has("forge")
  ) {
    return "mechanic";
  }

  const helperLike =
    wordList[0] !== undefined &&
    HELPER_VERBS.has(wordList[0]);

  if (
    !helperLike &&
    wordList.length === 1 &&
    matches.has("phase")
  ) {
    return "phase";
  }

  const priority: GameplayIntentNodeKind[] = helperLike
    ? [
        "policy",
        "role",
        "resource",
        "objective",
        "mechanic",
        "spatial-region",
        "lifecycle",
      ]
    : [
        "lifecycle",
        "role",
        "policy",
        "resource",
        "spatial-region",
        "objective",
        "mechanic",
        "phase",
      ];

  for (const kind of priority) {
    if (matches.has(kind)) return kind;
  }

  // Helper-like symbols that only mention a phase name are
  // implementation helpers, not reliable evidence of a gameplay phase.
  if (helperLike && matches.has("phase")) {
    return undefined;
  }

  return matches.values().next().value;
}

function acceptsOutcomeDiscriminant(
  propertyName: string,
  sourceSignal: GameplayIntentSignal | undefined,
  sourceName: string | undefined,
): boolean {
  if (
    sourceSignal === undefined ||
    !/^(?:action|outcome|result|kind|type)$/i.test(
      propertyName,
    )
  ) {
    return false;
  }

  if (/^action$/i.test(propertyName)) return true;

  const firstWord =
    sourceName === undefined
      ? undefined
      : normalize(sourceName).split(/\s+/).filter(Boolean)[0];
  const structuralHelper =
    firstWord !== undefined &&
    [
      "build",
      "create",
      "format",
      "normalize",
      "resolve",
    ].includes(firstWord);

  if (
    structuralHelper &&
    (
      sourceSignal.nodeKind === "resource" ||
      sourceSignal.nodeKind === "mechanic" ||
      sourceSignal.nodeKind === "spatial-region"
    )
  ) {
    return false;
  }

  return true;
}

function acceptsStatusDiscriminant(
  propertyName: string,
  sourceClassified: boolean,
): boolean {
  return sourceClassified && /^status$/i.test(propertyName);
}

function policyOperandPaths(
  operand: {
    kind: string;
    path?: string;
    base?: unknown;
    key?: unknown;
  },
): string[] {
  if (operand.kind === "path" && operand.path) {
    return [operand.path];
  }
  if (operand.kind === "index") {
    return [
      ...policyOperandPaths(
        operand.base as Parameters<typeof policyOperandPaths>[0],
      ),
      ...policyOperandPaths(
        operand.key as Parameters<typeof policyOperandPaths>[0],
      ),
    ];
  }
  return [];
}

function policyPredicatePaths(
  predicate: NonNullable<
    GameplayIntentSignal["policyPredicate"]
  >,
): string[] {
  if (
    predicate.kind === "truthy" ||
    predicate.kind === "falsy"
  ) {
    return policyOperandPaths(predicate.operand);
  }
  if (predicate.kind === "comparison") {
    return [
      ...policyOperandPaths(predicate.left),
      ...policyOperandPaths(predicate.right),
    ];
  }
  if (predicate.kind === "in") {
    return policyOperandPaths(predicate.operand);
  }
  if (predicate.kind === "all" || predicate.kind === "any") {
    return predicate.predicates.flatMap(
      policyPredicatePaths,
    );
  }
  if (predicate.kind === "fallback") {
    return predicate.excludedPredicates.flatMap(
      policyPredicatePaths,
    );
  }
  return [];
}

function predicateUsesOnlyMinifiedRoots(
  predicate: NonNullable<
    GameplayIntentSignal["policyPredicate"]
  >,
): boolean {
  const paths = policyPredicatePaths(predicate);
  if (paths.length === 0) return false;

  const roots = paths.map(
    (path) =>
      path.split(/[.[]/, 1)[0] ?? "",
  );
  return roots.every(
    (root) => /^[A-Za-z_$]$/.test(root),
  );
}

function contiguousIndexRanges(
  values: readonly number[],
): Array<{ min: number; max: number }> {
  const sorted = [...new Set(values)].sort(
    (a, b) => a - b,
  );
  if (sorted.length === 0) return [];

  const ranges: Array<{ min: number; max: number }> = [];
  let min = sorted[0]!;
  let max = min;

  for (const value of sorted.slice(1)) {
    if (value === max + 1) {
      max = value;
      continue;
    }
    ranges.push({ min, max });
    min = value;
    max = value;
  }
  ranges.push({ min, max });
  return ranges;
}

function title(value: string): string {
  return normalize(value)
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function pushSignal(
  output: Map<string, GameplayIntentSignal>,
  signal: GameplayIntentSignal,
): void {
  const existing = output.get(signal.subjectKey);
  if (!existing) {
    output.set(signal.subjectKey, signal);
    return;
  }

  const rank = { hypothesis: 0, inferred: 1, authored: 2 } as const;
  const preferred = rank[signal.status] > rank[existing.status]
    ? signal : existing;
  // A semantic subject can have several exact sites in one or many files.
  // Do not discard them when a stronger/duplicate signal wins the label.
  const returns = [
    ...(existing.returnOutcomeOrigins ?? []),
    ...(signal.returnOutcomeOrigins ?? []),
  ];
  const mutations = [
    ...(existing.stateMutationOrigins ?? []),
    ...(signal.stateMutationOrigins ?? []),
  ];
  const actions = [
    ...(existing.resourceActionOrigins ?? []),
    ...(signal.resourceActionOrigins ?? []),
  ];
  output.set(signal.subjectKey, {
    ...preferred,
    ...(returns.length > 0 ? { returnOutcomeOrigins: returns } : {}),
    ...(mutations.length > 0 ? { stateMutationOrigins: mutations } : {}),
    ...(actions.length > 0 ? { resourceActionOrigins: actions } : {}),
  });
}

function declaredMemberSignal(
  sourcePath: string,
  member: NonNullable<
    ParsedScriptFile["declaredMembers"]
  >[number],
): GameplayIntentSignal | undefined {
  const base = lexicalSignal(
    sourcePath,
    member.member,
  );
  if (!base || member.memberKind !== "property") {
    return base;
  }

  if (base.nodeKind !== "phase") {
    return base;
  }

  const words =
    normalize(member.member).split(/\s+/).filter(Boolean);
  const measurementWords = new Set([
    "index",
    "indexes",
    "name",
    "names",
    "count",
    "total",
    "ticks",
    "time",
    "times",
    "list",
    "map",
    "ids",
    "id",
  ]);

  const nodeKind: GameplayIntentNodeKind =
    words.some((word) => measurementWords.has(word))
      ? "resource"
      : "state";

  return {
    ...base,
    subjectKey:
      nodeKind + ":" + slug(member.member),
    nodeKind,
  };
}

export interface GameplayIntentSurfaceSignalInput {
  readonly label: string;
  readonly locator: string;
  readonly evidenceOrigin:
    GameplayIntentSignal["evidenceOrigin"];
  readonly status?: GameplayIntentSignal["status"];
  readonly summary?: string;
}

export function extractGameplayIntentSurfaceSignal(
  input: GameplayIntentSurfaceSignalInput,
): GameplayIntentSignal | undefined {
  const base = lexicalSignal(
    input.locator,
    input.label,
  );
  if (!base) return undefined;

  return {
    ...base,
    status: input.status ?? "inferred",
    evidenceOrigin: input.evidenceOrigin,
    locator: input.locator,
    summary:
      input.summary ??
      "Selected-artifact surface naming exposes a bounded gameplay-intent candidate; semantics require corroboration before it becomes intended-design authority.",
  };
}

function lexicalSignal(
  sourcePath: string,
  symbol: string,
): GameplayIntentSignal | undefined {
  const kind = classify(symbol);
  if (!kind) return undefined;
  const key = kind + ":" + slug(symbol);
  return {
    id: "signal:" + key + ":" + slug(sourcePath),
    subjectKey: key,
    nodeKind: kind,
    label: title(symbol),
    status: "inferred",
    evidenceOrigin: "source-code",
    locator: sourcePath,
    summary:
      "Source naming provides a bounded intent candidate; semantics remain inferred until stronger evidence is bound.",
  };
}

export function extractGameplayIntentSignals(
  scripts: readonly ParsedScriptFile[],
  crossFileCallEdges: readonly CrossFileCallEdge[] = [],
): GameplayIntentSignalSet {
  const signals = new Map<string, GameplayIntentSignal>();
  const relations = new Map<string, GameplayIntentRelationSignal>();
  const executableScriptCount = scripts.filter((script) => {
    const normalized =
      "/" + script.source.relativePath.replaceAll("\\", "/");
    return normalized.includes("/scripts/");
  }).length;
  const declaredMemberRecoveryEnabled =
    executableScriptCount <= 2;
  const typedTransitionSignatures = new Set(
    scripts.flatMap((script) =>
      (script.transitionDeclarations ?? [])
        .filter(
          (transition) =>
            transition.stateType !== undefined,
        )
        .map(
          (transition) =>
            transition.tableName +
            "::" +
            transition.from +
            "::" +
            transition.to.join(","),
        ),
    ),
  );
  const outcomeCoverage = new Map<
    string,
    {
      totalLiteralReturnSites: number;
      directlyGuardedReturnSites: number;
    }
  >();

  const spatialContextSeriesByPath = new Map<
    string,
    {
      collectionName: string;
      contextCount: number;
      offsetPath: string;
      offsetBase: { x: number; y: number; z: number };
      offsetStride: { x: number; y: number; z: number };
      contextIdPrefix?: string;
      contextIdIndexBase?: number;
    }[]
  >();

  for (const script of scripts) {
    const items = (script.spatialContextOffsetSeries ?? []).map(
      (item) => ({
        collectionName: item.collectionName,
        contextCount: item.contextCount,
        offsetPath: item.offsetPath,
        offsetBase: item.offsetBase,
        offsetStride: item.offsetStride,
        ...(item.contextIdPrefix === undefined
          ? {}
          : { contextIdPrefix: item.contextIdPrefix }),
        ...(item.contextIdIndexBase === undefined
          ? {}
          : { contextIdIndexBase: item.contextIdIndexBase }),
      }),
    );
    if (items.length > 0) {
      spatialContextSeriesByPath.set(
        script.source.relativePath,
        items,
      );
    }
  }

  const spatialTransformByPath = new Map<
    string,
    {
      functionName: string;
      offsetPath: string;
    }
  >();

  for (const script of scripts) {
    const usedFunctions = new Set(
      (script.spatialTransformUses ?? []).map(
        (item) => item.functionName,
      ),
    );
    const candidates =
      (script.spatialOffsetTransforms ?? []).filter(
        (item) => usedFunctions.has(item.functionName),
      );

    const offsetPaths = [
      ...new Set(
        candidates.map((item) => item.offsetPath),
      ),
    ];
    if (
      candidates.length > 0 &&
      offsetPaths.length === 1
    ) {
      const chosen = [...candidates].sort(
        (a, b) =>
          a.functionName.localeCompare(b.functionName),
      )[0]!;
      spatialTransformByPath.set(
        script.source.relativePath,
        {
          functionName: chosen.functionName,
          offsetPath: chosen.offsetPath,
        },
      );
    }
  }

  const spatialRouteGroups = new Map<
    string,
    {
      routeId: string;
      collectionHint?: string;
      locators: Set<string>;
      points: Map<
        string,
        {
          x: number;
          y: number;
          z: number;
          index?: number;
        }
      >;
    }
  >();

  for (const script of scripts) {
    for (const point of script.spatialRoutePoints ?? []) {
      const groupKey =
        point.routeId + "\u0000" +
        (point.collectionHint ?? "");
      const group = spatialRouteGroups.get(groupKey) ?? {
        routeId: point.routeId,
        ...(point.collectionHint === undefined
          ? {}
          : { collectionHint: point.collectionHint }),
        locators: new Set<string>(),
        points: new Map(),
      };

      group.locators.add(point.source.relativePath);
      const pointKey = [
        point.index ?? "",
        point.location.x,
        point.location.y,
        point.location.z,
      ].join("|");
      group.points.set(pointKey, {
        ...point.location,
        ...(point.index === undefined
          ? {}
          : { index: point.index }),
      });
      spatialRouteGroups.set(groupKey, group);
    }
  }

  const pushRelation = (
    relation: GameplayIntentRelationSignal,
  ): void => {
    const existing = relations.get(relation.id);
    if (!existing) {
      relations.set(relation.id, relation);
    } else if (relation.localCallOrigins?.length ||
        relation.crossFileCallOrigins?.length ||
        relation.callbackOrigins?.length ||
        relation.stateMutationOrigins?.length) {
      // Preserve every call site when a single inferred relationship has
      // multiple technical origins, including repeated scheduler/event sites.
      relations.set(relation.id, {
        ...existing,
        localCallOrigins: [
          ...(existing.localCallOrigins ?? []),
          ...(relation.localCallOrigins ?? []),
        ],
        callbackOrigins: [
          ...(existing.callbackOrigins ?? []),
          ...(relation.callbackOrigins ?? []),
        ],
        crossFileCallOrigins: [
          ...(existing.crossFileCallOrigins ?? []),
          ...(relation.crossFileCallOrigins ?? []),
        ],
        stateMutationOrigins: [
          ...(existing.stateMutationOrigins ?? []),
          ...(relation.stateMutationOrigins ?? []),
        ],
      });
    }
  };

  const recordOutcomeCoverage = (
    outcomeSubjectKey: string,
    kind: "total" | "guarded",
  ): void => {
    const current = outcomeCoverage.get(outcomeSubjectKey) ?? {
      totalLiteralReturnSites: 0,
      directlyGuardedReturnSites: 0,
    };
    if (kind === "total") current.totalLiteralReturnSites += 1;
    else current.directlyGuardedReturnSites += 1;
    outcomeCoverage.set(outcomeSubjectKey, current);
  };

  const routeIdGroupCounts = new Map<string, number>();
  for (const group of spatialRouteGroups.values()) {
    routeIdGroupCounts.set(
      group.routeId,
      (routeIdGroupCounts.get(group.routeId) ?? 0) + 1,
    );
  }

  for (const group of spatialRouteGroups.values()) {
    const ambiguous =
      (routeIdGroupCounts.get(group.routeId) ?? 0) > 1;
    const disambiguator =
      ambiguous && group.collectionHint
        ? "-" + slug(group.collectionHint)
        : "";
    const subjectKey =
      "spatial-region:route-" +
      slug(group.routeId) +
      disambiguator;
    const points = [...group.points.values()].sort(
      (a, b) =>
        (a.index ?? Number.MAX_SAFE_INTEGER) -
          (b.index ?? Number.MAX_SAFE_INTEGER) ||
        a.x - b.x ||
        a.y - b.y ||
        a.z - b.z,
    );
    const indexes = points
      .map((point) => point.index)
      .filter((value): value is number =>
        value !== undefined
      );
    const locator =
      [...group.locators].sort()[0] ?? "unknown";
    const transformCandidates = [
      ...group.locators,
    ]
      .map((path) => spatialTransformByPath.get(path))
      .filter(
        (
          item,
        ): item is {
          functionName: string;
          offsetPath: string;
        } => item !== undefined,
      );
    const transformKeys = [
      ...new Set(
        transformCandidates.map(
          (item) =>
            item.functionName + "::" + item.offsetPath,
        ),
      ),
    ];
    const transform =
      transformKeys.length === 1
        ? transformCandidates[0]
        : undefined;
    const coordinateSpace =
      transform === undefined ? "unknown" : "local";

    const contextSeriesCandidates =
      transform === undefined
        ? []
        : [...group.locators]
            .flatMap(
              (path) =>
                spatialContextSeriesByPath.get(path) ?? [],
            )
            .filter(
              (item) =>
                item.offsetPath === transform.offsetPath,
            );
    const contextSeriesKeys = [
      ...new Set(
        contextSeriesCandidates.map((item) =>
          JSON.stringify(item)
        ),
      ),
    ];
    const contextSeries =
      contextSeriesKeys.length === 1
        ? contextSeriesCandidates[0]
        : undefined;

    pushSignal(signals, {
      id:
        "signal:" +
        subjectKey + ":" +
        slug(locator),
      subjectKey,
      nodeKind: "spatial-region",
      label: "Route " + title(group.routeId),
      status: "authored",
      evidenceOrigin: "source-code",
      locator,
      summary:
        "Authored route-point data declares " +
        points.length +
        " unique point(s)" +
        (indexes.length === 0
          ? ""
          : " with index range " +
            Math.min(...indexes) +
            ".." +
            Math.max(...indexes)) +
        (transform === undefined
          ? ". Coordinate space remains unresolved until transform usage is proven."
          : ". Source proves these authored points are offset from local coordinates through " +
            transform.functionName +
            " using context." +
            transform.offsetPath +
            "."),
      spatialProfile: {
        coordinateSpace,
        routeId: group.routeId,
        ...(group.collectionHint === undefined
          ? {}
          : { collectionHint: group.collectionHint }),
        points,
        ...(indexes.length === 0
          ? {}
          : {
              indexRanges:
                contiguousIndexRanges(indexes),
            }),
        ...(transform === undefined
          ? {}
          : {
              transform: {
                kind: "offset",
                offsetPath: transform.offsetPath,
                functionName: transform.functionName,
              },
            }),
        ...(contextSeries === undefined
          ? {}
          : { contextSeries }),
      },
    });
  }

  for (const script of scripts) {
    const path = script.source.relativePath;

    for (const part of path.split(/[\\/]/)) {
      const base = part.replace(/\.[^.]+$/, "");
      const signal = lexicalSignal(path, base);
      if (signal) pushSignal(signals, signal);
    }

    const normalizedPath =
      "/" + path.replaceAll("\\", "/");
    const bundledExecutable =
      declaredMemberRecoveryEnabled &&
      normalizedPath.includes("/scripts/");
    if (bundledExecutable) {
      for (const member of script.declaredMembers ?? []) {
        const signal =
          declaredMemberSignal(path, member);
        if (signal) {
          pushSignal(signals, {
            ...signal,
            summary:
              "A declared class member name survives bundling and provides bounded authored-structure intent evidence.",
          });
        }
      }
    }

    for (const exposure of script.lifecycleMemberExposures) {
      const kind = classify(exposure.member) ?? "lifecycle";
      const key = kind + ":" + slug(exposure.member);
      pushSignal(signals, {
        id: "signal:" + key + ":" + slug(path),
        subjectKey: key,
        nodeKind: kind,
        label: title(exposure.member),
        status:
          exposure.evidence === "exact-symbol"
            ? "authored"
            : "inferred",
        evidenceOrigin: "source-code",
        locator: path,
        summary:
          exposure.evidence === "exact-symbol"
            ? "Exact lifecycle symbol is explicitly exposed by source."
            : "Lifecycle member is lexically present but not symbol-resolved.",
      });
    }

    for (const comparison of script.enumValueComparisons) {
      const raw =
        comparison.enumName + " " + comparison.member;
      const key = "state:" + slug(raw);
      pushSignal(signals, {
        id: "signal:" + key + ":" + slug(path),
        subjectKey: key,
        nodeKind: "state",
        label: title(raw),
        status: "authored",
        evidenceOrigin: "source-code",
        locator: path,
        summary:
          "Source explicitly compares a declared enum member, providing authored state evidence.",
      });
    }

    for (const call of script.localFunctionCalls) {
      const target = lexicalSignal(path, call.targetName);
      if (target) pushSignal(signals, target);

      const callerName = call.callerRegion.replace(/^function:/, "");
      const caller =
        call.callerRegion === "module"
          ? undefined
          : lexicalSignal(path, callerName);
      if (caller) pushSignal(signals, caller);

      if (caller && target) {
        pushRelation({
          id:
            "relation:requires:" +
            caller.subjectKey + ":" +
            target.subjectKey + ":" +
            slug(path),
          fromSubjectKey: caller.subjectKey,
          toSubjectKey: target.subjectKey,
          edgeKind: "requires",
          status: "inferred",
          evidenceOrigin: "source-code",
          locator: path,
          localCallOrigins: [{ scriptSource: script.source, call }],
          summary:
            "A semantically classified source region directly calls another classified gameplay region.",
        });
      }
    }

    for (const mutation of script.stateMutations ?? []) {
      const sourceName =
        mutation.executionRegion === "module"
          ? undefined
          : mutation.executionRegion.replace(/^function:/, "");
      const sourceSignal = sourceName
        ? lexicalSignal(path, sourceName)
        : undefined;
      if (sourceSignal) pushSignal(signals, sourceSignal);

      const rawValue =
        mutation.value.kind === "member"
          ? mutation.value.owner + " " + mutation.value.member
          : mutation.targetName + " " + mutation.value.literal;
      const stateKey = "state:" + slug(rawValue);
      const stateSignal: GameplayIntentSignal = {
        id: "signal:" + stateKey + ":" + slug(path),
        subjectKey: stateKey,
        nodeKind: "state",
        label: title(rawValue),
        status: "authored",
        evidenceOrigin: "source-code",
        locator: path,
        summary:
          "Source explicitly assigns a gameplay state-like variable to this value.",
        stateMutationOrigins: [{ scriptSource: script.source, mutation }],
      };
      pushSignal(signals, stateSignal);

      if (sourceSignal) {
        pushRelation({
          id:
            "relation:transitions-to:" +
            sourceSignal.subjectKey + ":" +
            stateKey + ":" +
            slug(path),
          fromSubjectKey: sourceSignal.subjectKey,
          toSubjectKey: stateKey,
          edgeKind: "transitions-to",
          status: "inferred",
          evidenceOrigin: "source-code",
          locator: path,
          summary:
            "A classified gameplay source region explicitly assigns the target state value.",
          stateMutationOrigins: [{ scriptSource: script.source, mutation }],
        });
      }
    }

    for (const property of script.typeProperties ?? []) {
      const container = lexicalSignal(path, property.containerName);
      if (container) pushSignal(signals, container);

      const referencedType = property.typeText.match(
        /\b([A-Z][A-Za-z0-9_$]*)\b/,
      )?.[1];
      const target = referencedType
        ? lexicalSignal(path, referencedType)
        : undefined;
      if (target) pushSignal(signals, target);

      if (
        property.propertyName === "owner" &&
        container &&
        target
      ) {
        pushRelation({
          id:
            "relation:owns:" +
            target.subjectKey + ":" +
            container.subjectKey + ":" +
            slug(path),
          fromSubjectKey: target.subjectKey,
          toSubjectKey: container.subjectKey,
          edgeKind: "owns",
          status: "authored",
          evidenceOrigin: "source-code",
          locator: path,
          summary:
            "An authored type property explicitly declares the owner type of this gameplay record.",
        });
      } else if (
        /^(?:resources|roster|members|players|arenas|sessions)$/i.test(
          property.propertyName,
        ) &&
        container &&
        target
      ) {
        pushRelation({
          id:
            "relation:owns:" +
            container.subjectKey + ":" +
            target.subjectKey + ":" +
            slug(path),
          fromSubjectKey: container.subjectKey,
          toSubjectKey: target.subjectKey,
          edgeKind: "owns",
          status: "inferred",
          evidenceOrigin: "source-code",
          locator: path,
          summary:
            "An authored aggregate property structurally contains gameplay records; lifecycle ownership remains inferred.",
        });
      }
    }

    for (const transition of script.transitionDeclarations ?? []) {
      const transitionSignature =
        transition.tableName +
        "::" +
        transition.from +
        "::" +
        transition.to.join(",");
      if (
        transition.stateType === undefined &&
        typedTransitionSignatures.has(
          transitionSignature,
        )
      ) {
        continue;
      }

      const stateType =
        transition.stateType ?? transition.tableName;
      const fromKey =
        "state:" + slug(stateType + " " + transition.from);
      const fromSignal: GameplayIntentSignal = {
        id: "signal:" + fromKey + ":" + slug(path),
        subjectKey: fromKey,
        nodeKind: "state",
        label: title(stateType + " " + transition.from),
        status: "authored",
        evidenceOrigin: "source-code",
        locator: path,
        summary:
          "Source explicitly declares this state as a transition-table key.",
      };
      pushSignal(signals, fromSignal);

      for (const targetState of transition.to) {
        const toKey =
          "state:" + slug(stateType + " " + targetState);
        const toSignal: GameplayIntentSignal = {
          id: "signal:" + toKey + ":" + slug(path),
          subjectKey: toKey,
          nodeKind: "state",
          label: title(stateType + " " + targetState),
          status: "authored",
          evidenceOrigin: "source-code",
          locator: path,
          summary:
            "Source explicitly declares this state as a transition-table target.",
        };
        pushSignal(signals, toSignal);
        pushRelation({
          id:
            "relation:transitions-to:" +
            fromKey + ":" + toKey + ":" + slug(path),
          fromSubjectKey: fromKey,
          toSubjectKey: toKey,
          edgeKind: "transitions-to",
          status: "authored",
          evidenceOrigin: "source-code",
          locator: path,
          summary:
            "An authored transition table explicitly permits this state transition.",
        });
      }
    }

    for (const guarded of script.guardedOutcomes ?? []) {
      const sourceName =
        guarded.executionRegion === "module"
          ? guarded.propertyName
          : guarded.executionRegion.replace(/^function:/, "");
      const sourceSignal =
        guarded.executionRegion === "module"
          ? undefined
          : lexicalSignal(path, sourceName);
      if (
        !acceptsOutcomeDiscriminant(
          guarded.propertyName,
          sourceSignal,
          sourceName,
        ) &&
        !acceptsStatusDiscriminant(
          guarded.propertyName,
          sourceSignal !== undefined,
        )
      ) {
        continue;
      }
      if (sourceSignal) pushSignal(signals, sourceSignal);

      if (
        acceptsStatusDiscriminant(
          guarded.propertyName,
          sourceSignal !== undefined,
        )
      ) {
        const stateKey =
          "state:" +
          slug(sourceName) + ":" +
          slug(guarded.value);
        pushSignal(signals, {
          id: "signal:" + stateKey + ":" + slug(path),
          subjectKey: stateKey,
          nodeKind: "state",
          label: title(sourceName + " " + guarded.value),
          status: "authored",
          evidenceOrigin: "source-code",
          locator: path,
          summary:
            "Source explicitly returns this discriminated status value from a classified gameplay function.",
        });

        const minifiedGuard =
          bundledExecutable &&
          predicateUsesOnlyMinifiedRoots(
            guarded.predicate,
          );
        const policyKey =
          "policy:" +
          slug(sourceName + " " + guarded.conditionText);
        pushSignal(signals, {
          id: "signal:" + policyKey + ":" + slug(path),
          subjectKey: policyKey,
          nodeKind: "policy",
          label: minifiedGuard
            ? title(
                sourceName +
                " guarded " +
                guarded.value,
              )
            : title(
                sourceName +
                " when " +
                guarded.conditionText,
              ),
          status: "authored",
          evidenceOrigin: "source-code",
          locator: path,
          summary: minifiedGuard
            ? "Source directly guards this status branch, but predicate operands are minified and cannot safely bind to runtime state."
            : "Source directly guards this status branch with the recorded condition.",
          policyPredicate: minifiedGuard
            ? {
                kind: "unknown",
                text: guarded.conditionText,
              }
            : guarded.predicate,
        });

        pushRelation({
          id:
            "relation:requires:" +
            stateKey + ":" +
            policyKey + ":" +
            slug(path),
          fromSubjectKey: stateKey,
          toSubjectKey: policyKey,
          edgeKind: "requires",
          status: "authored",
          evidenceOrigin: "source-code",
          locator: path,
          summary:
            "This returned status state is control-flow guarded by the authored condition.",
        });

        if (sourceSignal) {
          pushRelation({
            id:
              "relation:produces:" +
              sourceSignal.subjectKey + ":" +
              stateKey + ":" +
              slug(path),
            fromSubjectKey: sourceSignal.subjectKey,
            toSubjectKey: stateKey,
            edgeKind: "produces",
            status: "inferred",
            evidenceOrigin: "source-code",
            locator: path,
            summary:
              "A classified gameplay function explicitly returns this status state.",
          });
        }
        continue;
      }

      const outcomeKey =
        "outcome:" +
        slug(sourceName + " " + guarded.value);
      recordOutcomeCoverage(outcomeKey, "guarded");

      const outcomeSignal: GameplayIntentSignal = {
        id: "signal:" + outcomeKey + ":" + slug(path),
        subjectKey: outcomeKey,
        nodeKind: "outcome",
        label: title(sourceName + " " + guarded.value),
        status: "authored",
        evidenceOrigin: "source-code",
        locator: path,
        summary:
          "Source explicitly returns this discriminated outcome under a direct guard.",
      };
      pushSignal(signals, outcomeSignal);

      const minifiedGuard =
        bundledExecutable &&
        predicateUsesOnlyMinifiedRoots(
          guarded.predicate,
        );
      const policyKey =
        "policy:" +
        slug(sourceName + " " + guarded.conditionText);
      const policySignal: GameplayIntentSignal = {
        id: "signal:" + policyKey + ":" + slug(path),
        subjectKey: policyKey,
        nodeKind: "policy",
        label: minifiedGuard
          ? title(
              sourceName +
              " guarded " +
              guarded.value,
            )
          : title(
              sourceName +
              " when " +
              guarded.conditionText,
            ),
        status: "authored",
        evidenceOrigin: "source-code",
        locator: path,
        summary: minifiedGuard
          ? "Source directly guards this return branch, but predicate operands are minified and cannot safely bind to runtime state."
          : "Source directly guards this return branch with the recorded condition.",
        policyPredicate: minifiedGuard
          ? {
              kind: "unknown",
              text: guarded.conditionText,
            }
          : guarded.predicate,
      };
      pushSignal(signals, policySignal);

      pushRelation({
        id:
          "relation:requires:" +
          outcomeKey + ":" +
          policyKey + ":" +
          slug(path),
        fromSubjectKey: outcomeKey,
        toSubjectKey: policyKey,
        edgeKind: "requires",
        status: "authored",
        evidenceOrigin: "source-code",
        locator: path,
        summary:
          "This direct outcome branch is control-flow guarded by the authored condition.",
      });
    }

    // Tie source-observed lifecycle resource actions only to already classified
    // named function candidates. Do not fabricate cleanup semantics or a
    // gameplay relationship from a removeTag/clearRun call alone.
    for (const action of script.cleanupResourceEvidence ?? []) {
      if (!action.executionRegion.startsWith("function:")) continue;
      const signal = lexicalSignal(
        path, action.executionRegion.slice("function:".length),
      );
      if (!signal) continue;
      pushSignal(signals, {
        ...signal,
        resourceActionOrigins: [{ scriptSource: script.source, action }],
      });
    }

    for (const outcome of script.returnOutcomes ?? []) {
      const sourceName =
        outcome.executionRegion === "module"
          ? undefined
          : outcome.executionRegion.replace(/^function:/, "");
      const sourceSignal = sourceName
        ? lexicalSignal(path, sourceName)
        : undefined;

      if (
        acceptsStatusDiscriminant(
          outcome.propertyName,
          sourceSignal !== undefined,
        )
      ) {
        if (sourceSignal) pushSignal(signals, sourceSignal);
        const stateKey =
          "state:" +
          slug(sourceName ?? outcome.propertyName) + ":" +
          slug(outcome.value);
        pushSignal(signals, {
          id: "signal:" + stateKey + ":" + slug(path),
          subjectKey: stateKey,
          nodeKind: "state",
          label: title(
            (sourceName ?? outcome.propertyName) +
            " " +
            outcome.value,
          ),
          status: "authored",
          evidenceOrigin: "source-code",
          locator: path,
          summary:
            "Source explicitly returns this discriminated status value from a classified gameplay function.",
          returnOutcomeOrigins: [{ scriptSource: script.source, outcome }],
        });
        if (sourceSignal) {
          pushRelation({
            id:
              "relation:produces:" +
              sourceSignal.subjectKey + ":" +
              stateKey + ":" +
              slug(path),
            fromSubjectKey: sourceSignal.subjectKey,
            toSubjectKey: stateKey,
            edgeKind: "produces",
            status: "inferred",
            evidenceOrigin: "source-code",
            locator: path,
            summary:
              "A classified gameplay function explicitly returns this status state.",
          });
        }
        continue;
      }

      if (
        !acceptsOutcomeDiscriminant(
          outcome.propertyName,
          sourceSignal,
          sourceName,
        )
      ) {
        continue;
      }
      if (sourceSignal) pushSignal(signals, sourceSignal);

      const outcomeKey =
        "outcome:" +
        slug((sourceName ?? outcome.propertyName) + " " + outcome.value);
      recordOutcomeCoverage(outcomeKey, "total");

      const outcomeSignal: GameplayIntentSignal = {
        id: "signal:" + outcomeKey + ":" + slug(path),
        subjectKey: outcomeKey,
        nodeKind: "outcome",
        label: title((sourceName ?? outcome.propertyName) + " " + outcome.value),
        status: "authored",
        evidenceOrigin: "source-code",
        locator: path,
        summary:
          "Source explicitly returns this discriminated gameplay outcome.",
        returnOutcomeOrigins: [{ scriptSource: script.source, outcome }],
      };
      pushSignal(signals, outcomeSignal);

      if (sourceSignal) {
        pushRelation({
          id:
            "relation:produces:" +
            sourceSignal.subjectKey + ":" +
            outcomeKey + ":" +
            slug(path),
          fromSubjectKey: sourceSignal.subjectKey,
          toSubjectKey: outcomeKey,
          edgeKind: "produces",
          status: "inferred",
          evidenceOrigin: "source-code",
          locator: path,
          summary:
            "A classified gameplay function explicitly returns this outcome; the gameplay meaning of the function remains inferred.",
        });
      }
    }

    for (const event of script.events) {
      const signal = lexicalSignal(path, event.event);
      if (signal) pushSignal(signals, signal);
      // Only a resolved named callback may form an inferred gameplay
      // association. Anonymous/unknown regions remain visible in Semantic IR.
      const callbackName = event.callbackRegion?.startsWith("function:")
        ? event.callbackRegion.slice("function:".length) : undefined;
      const callbackSignal = callbackName
        ? lexicalSignal(path, callbackName) : undefined;
      if (callbackSignal) pushSignal(signals, callbackSignal);
      if (signal && callbackSignal && event.callbackRegion) {
        pushRelation({
          id: "relation:participates-in:" + signal.subjectKey + ":" +
            callbackSignal.subjectKey + ":" + slug(path),
          fromSubjectKey: signal.subjectKey,
          toSubjectKey: callbackSignal.subjectKey,
          edgeKind: "participates-in",
          status: "inferred",
          evidenceOrigin: "source-code",
          locator: path,
          callbackOrigins: [{ kind: "event", scriptSource: script.source,
            scriptIdentifier: script.identifier, event }],
          summary: "A named handler is subscribed to this event. Its gameplay purpose remains inferred.",
        });
      }
    }

    for (const callback of script.deferredCallbacks) {
      const callerName = callback.callerRegion?.startsWith("function:")
        ? callback.callerRegion.slice("function:".length) : undefined;
      const targetName = callback.callbackRegion?.startsWith("function:")
        ? callback.callbackRegion.slice("function:".length) : undefined;
      const caller = callerName ? lexicalSignal(path, callerName) : undefined;
      const target = targetName ? lexicalSignal(path, targetName) : undefined;
      if (caller) pushSignal(signals, caller);
      if (target) pushSignal(signals, target);
      if (caller && target) {
        pushRelation({
          id: "relation:participates-in:" + caller.subjectKey + ":" +
            target.subjectKey + ":" + slug(path),
          fromSubjectKey: caller.subjectKey,
          toSubjectKey: target.subjectKey,
          edgeKind: "participates-in",
          status: "inferred",
          evidenceOrigin: "source-code",
          locator: path,
          callbackOrigins: [{ kind: "scheduler", scriptSource: script.source,
            callback }],
          summary: "A named callback is scheduled from this region. Timing and gameplay purpose remain distinct.",
        });
      }
    }

    for (const property of script.dynamicProperties) {
      if (!property.propertyId) continue;
      const signal = lexicalSignal(path, property.propertyId);
      if (signal) pushSignal(signals, signal);
    }

    for (const command of script.commandLiterals) {
      const scoreboard = command.command.match(
        /\bscoreboard\s+players\s+(?:set|add|remove|reset)\s+\S+\s+([^\s]+)/i,
      );
      if (scoreboard?.[1]) {
        const objective = scoreboard[1];
        const key = "resource:" + slug(objective);
        pushSignal(signals, {
          id: "signal:" + key + ":" + slug(path),
          subjectKey: key,
          nodeKind: "resource",
          label: title(objective),
          status: "authored",
          evidenceOrigin: "scoreboard",
          locator: path,
          summary:
            "Source command explicitly reads or mutates this scoreboard objective.",
        });
      }
    }
  }

  // The existing cross-file resolver owns imported binding and callable
  // identity. Keep source relationships only between *classified* gameplay
  // symbols; anonymous callbacks and unclassified utilities remain IR facts.
  // A named import is not evidence that a gameplay mechanic executed.
  const scriptsByPath = new Map<string, ParsedScriptFile[]>();
  for (const script of scripts) {
    const path = script.source.relativePath.replaceAll("\\", "/");
    scriptsByPath.set(path, [...(scriptsByPath.get(path) ?? []), script]);
  }
  for (const call of crossFileCallEdges) {
    if (call.status !== "resolved" ||
        call.targetRegion === undefined || call.targetModule === undefined ||
        !call.callerRegion.startsWith("function:") ||
        call.callerModule === call.targetModule) continue;
    const callers = scriptsByPath.get(call.callerModule) ?? [];
    const targets = scriptsByPath.get(call.targetModule) ?? [];
    if (callers.length !== 1 || targets.length !== 1) continue;
    const callerSource = callers[0]!.source;
    const targetSource = targets[0]!.source;
    if (callerSource.artifactId !== call.source.artifactId ||
        targetSource.artifactId !== call.source.artifactId ||
        callerSource.relativePath !== call.callerModule ||
        targetSource.relativePath !== call.targetModule) continue;
    const caller = lexicalSignal(call.callerModule,
      call.callerRegion.slice("function:".length));
    const target = lexicalSignal(call.targetModule, call.targetExport);
    if (!caller || !target) continue;
    pushSignal(signals, caller);
    pushSignal(signals, target);
    pushRelation({
      id: "relation:requires:cross-file:" + caller.subjectKey + ":" +
        target.subjectKey + ":" + slug(call.callerModule) + ":" +
        slug(call.targetModule),
      fromSubjectKey: caller.subjectKey,
      toSubjectKey: target.subjectKey,
      edgeKind: "requires",
      status: "inferred",
      evidenceOrigin: "source-code",
      locator: call.callerModule,
      crossFileCallOrigins: [{
        scriptSource: callerSource, targetScriptSource: targetSource, call,
      }],
      summary: "An exact imported executable function is called from a classified region in another script. Gameplay dependency and runtime execution remain inferred.",
    });
  }

  return {
    schemaVersion: 1,
    signals: [...signals.values()].sort(
      (a, b) => a.subjectKey.localeCompare(b.subjectKey),
    ),
    relations: [...relations.values()].sort(
      (a, b) => a.id.localeCompare(b.id),
    ),
    outcomePolicyCoverage: [...outcomeCoverage.entries()]
      .map(([outcomeSubjectKey, counts]) => ({
        outcomeSubjectKey,
        totalLiteralReturnSites:
          counts.totalLiteralReturnSites,
        directlyGuardedReturnSites:
          counts.directlyGuardedReturnSites,
        completeDirectGuardCoverage:
          counts.totalLiteralReturnSites > 0 &&
          counts.totalLiteralReturnSites ===
            counts.directlyGuardedReturnSites,
      }))
      .sort((a, b) =>
        a.outcomeSubjectKey.localeCompare(
          b.outcomeSubjectKey,
        ),
      ),
  };
}
