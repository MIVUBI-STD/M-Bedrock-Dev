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
      "observation", "observe", "building", "build", "active",
      "round", "transition", "finishing", "finish", "cinematic",
      "staging", "combat", "fortify", "laststand",
    ],
  },
  {
    kind: "lifecycle",
    terms: [
      "reset", "cleanup", "cleaning", "reconnect", "disconnect",
      "recovery", "recover", "respawn", "admission", "membership",
      "session", "rollback", "restore", "release",
    ],
  },
  {
    kind: "resource",
    terms: [
      "score", "scoring", "coin", "currency", "resource", "ledger",
      "inventory", "palette", "health", "points", "kit",
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
    kind: "mechanic",
    terms: [
      "interaction", "placement", "water", "craft", "shop",
      "revive", "upgrade", "similarity", "clone", "feedback",
      "hologram", "combat",
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

function classify(value: string): GameplayIntentNodeKind | undefined {
  const words = new Set(normalize(value).split(/\s+/).filter(Boolean));
  for (const entry of KIND_TERMS) {
    if (entry.terms.some((term) => words.has(term))) return entry.kind;
  }
  return undefined;
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

  const pushRelation = (
    relation: GameplayIntentRelationSignal,
  ): void => {
    if (!relations.has(relation.id)) {
      relations.set(relation.id, relation);
    }
  };

  for (const script of scripts) {
    const path = script.source.relativePath;

    for (const part of path.split(/[\\/]/)) {
      const base = part.replace(/\.[^.]+$/, "");
      const signal = lexicalSignal(path, base);
      if (signal) pushSignal(signals, signal);
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
  };
}
