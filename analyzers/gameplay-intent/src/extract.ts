import type {
  ParsedScriptFile,
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
      "victory", "defeat", "similarity",
    ],
  },
  {
    kind: "policy",
    terms: [
      "policy", "permission", "permissions", "rule", "rules",
      "restriction", "guard",
    ],
  },
  {
    kind: "mechanic",
    terms: [
      "interaction", "placement", "water", "craft", "shop",
      "revive", "upgrade", "similarity", "clone", "feedback",
      "hologram", "combat", "hud", "schematic", "wave",
      "knockdown", "reviver", "reviving", "effect", "effects",
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
  const words = new Set(wordList);
  const matches = new Set<GameplayIntentNodeKind>();

  for (const entry of KIND_TERMS) {
    if (entry.terms.some((term) => words.has(term))) {
      matches.add(entry.kind);
    }
  }

  if (matches.size === 0) return undefined;

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
        "resource",
        "objective",
        "mechanic",
        "spatial-region",
        "lifecycle",
      ]
    : [
        "lifecycle",
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
  sourceClassified: boolean,
): boolean {
  if (
    /^(?:action|outcome|result|status)$/i.test(propertyName)
  ) {
    return true;
  }

  return (
    sourceClassified &&
    /^(?:kind|type)$/i.test(propertyName)
  );
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
  if (rank[signal.status] > rank[existing.status]) {
    output.set(signal.subjectKey, signal);
  }
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

  const pushRelation = (
    relation: GameplayIntentRelationSignal,
  ): void => {
    if (!relations.has(relation.id)) {
      relations.set(relation.id, relation);
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

  for (const script of scripts) {
    const path = script.source.relativePath;

    for (const part of path.split(/[\\/]/)) {
      const base = part.replace(/\.[^.]+$/, "");
      const signal = lexicalSignal(path, base);
      if (signal) pushSignal(signals, signal);
    }

    const normalizedPath =
      "/" + path.replaceAll("\\", "/");
    if (
      declaredMemberRecoveryEnabled &&
      normalizedPath.includes("/scripts/")
    ) {
      for (const member of script.declaredMembers ?? []) {
        const signal = lexicalSignal(path, member.member);
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
          sourceSignal !== undefined,
        )
      ) {
        continue;
      }
      if (sourceSignal) pushSignal(signals, sourceSignal);

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

      const policyKey =
        "policy:" +
        slug(sourceName + " " + guarded.conditionText);
      const policySignal: GameplayIntentSignal = {
        id: "signal:" + policyKey + ":" + slug(path),
        subjectKey: policyKey,
        nodeKind: "policy",
        label: title(sourceName + " when " + guarded.conditionText),
        status: "authored",
        evidenceOrigin: "source-code",
        locator: path,
        summary:
          "Source directly guards this return branch with the recorded condition.",
        policyPredicate: guarded.predicate,
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

    for (const outcome of script.returnOutcomes ?? []) {
      const sourceName =
        outcome.executionRegion === "module"
          ? undefined
          : outcome.executionRegion.replace(/^function:/, "");
      const sourceSignal = sourceName
        ? lexicalSignal(path, sourceName)
        : undefined;
      if (
        !acceptsOutcomeDiscriminant(
          outcome.propertyName,
          sourceSignal !== undefined,
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
